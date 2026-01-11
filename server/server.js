const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const config = require('./config');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../client')));

// 存储连接信息
const clients = new Map(); // ws -> {username, connectionTime, userId}
const usernameToWs = new Map(); // username -> ws

// HTTP服务器
const server = http.createServer(app);

// WebSocket服务器
const wss = new WebSocket.Server({ port: config.WS_PORT });

// 用户认证路由
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
        }

        const user = await db.findUser(username);

        if (!user) {
            // 自动注册
            const crypto = require('crypto');
            const hashedPassword = crypto.createHash('md5').update(password).digest('hex');
            const userId = await db.createUser(username, hashedPassword);

            res.json({
                success: true,
                message: '注册成功',
                user: { id: userId, username }
            });
        } else {
            // 验证密码
            const crypto = require('crypto');
            const hashedPassword = crypto.createHash('md5').update(password).digest('hex');

            if (user.password === hashedPassword) {
                await db.updateLastLogin(username);
                res.json({
                    success: true,
                    message: '登录成功',
                    user: { id: user.id, username }
                });
            } else {
                res.status(401).json({ success: false, message: '密码错误' });
            }
        }
    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 获取在线用户列表
app.get('/api/online-users', (req, res) => {
    const users = Array.from(usernameToWs.keys());
    res.json({ users });
});

// WebSocket连接处理
wss.on('connection', (ws, req) => {
    const connectionId = generateConnectionId();
    const connectionTime = new Date().toISOString();
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    console.log(`[${new Date().toLocaleTimeString()}] 新客户端连接 #${connectionId} (IP: ${clientIp})`);

    // 初始化客户端信息
    clients.set(ws, {
        id: connectionId,
        ip: clientIp,
        connectionTime: connectionTime,
        username: null,
        userId: null
    });

    // 发送欢迎消息
    ws.send(JSON.stringify({
        type: 'system',
        message: '连接成功，请先登录'
    }));

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);

            switch (data.type) {
                case 'login':
                    await handleLogin(ws, data);
                    break;
                case 'message':
                    handleMessage(ws, data);
                    break;
                case 'image':
                    handleImage(ws, data);
                    break;
                case 'logout':
                    handleLogout(ws);
                    break;
                case 'ping':
                    // 心跳检测
                    ws.send(JSON.stringify({ type: 'pong' }));
                    break;
            }
        } catch (error) {
            console.error(`[${new Date().toLocaleTimeString()}] 消息处理错误:`, error);
        }
    });

    ws.on('close', () => {
        handleLogout(ws);
        const clientInfo = clients.get(ws);
        if (clientInfo && clientInfo.username) {
            console.log(`[${new Date().toLocaleTimeString()}] 客户端断开连接 #${clientInfo.id} (用户: ${clientInfo.username})`);
        } else {
            console.log(`[${new Date().toLocaleTimeString()}] 客户端断开连接 #${connectionId} (未登录)`);
        }
        clients.delete(ws);
    });

    ws.on('error', (error) => {
        console.error(`[${new Date().toLocaleTimeString()}] WebSocket错误 #${connectionId}:`, error);
    });
});

async function handleLogin(ws, data) {
    const { username } = data;
    const clientInfo = clients.get(ws);

    if (!clientInfo) {
        ws.send(JSON.stringify({
            type: 'login',
            success: false,
            message: '连接信息丢失'
        }));
        return;
    }

    // 检查用户是否已在线
    if (usernameToWs.has(username)) {
        ws.send(JSON.stringify({
            type: 'login',
            success: false,
            message: '该用户已在线'
        }));
        return;
    }

    // 更新客户端信息
    clientInfo.username = username;
    clientInfo.loginTime = new Date().toISOString();

    // 存储映射
    usernameToWs.set(username, ws);

    console.log(`[${new Date().toLocaleTimeString()}] 用户登录成功 #${clientInfo.id} (用户: ${username})`);

    // 发送登录成功消息
    ws.send(JSON.stringify({
        type: 'login',
        success: true,
        username,
        onlineUsers: getOnlineUsersExcluding(username)
    }));

    // 广播新用户上线
    broadcastToAll({
        type: 'user_online',
        username: username,
        onlineUsers: getOnlineUsersExcluding(null)
    }, ws);
}

function handleMessage(ws, data) {
    const clientInfo = clients.get(ws);
    if (!clientInfo || !clientInfo.username) return;

    const { to, content, messageType = 'text' } = data;
    const messageData = {
        type: 'message',
        from: clientInfo.username,
        to: to,
        content: content,
        timestamp: new Date().toISOString(),
        messageType: messageType
    };

    console.log(`[${new Date().toLocaleTimeString()}] 消息发送 ${clientInfo.username} -> ${to}: ${content.substring(0, 30)}...`);

    if (to === 'all') {
        // 群发
        broadcastToAll(messageData, ws);
    } else {
        // 私聊
        const targetWs = usernameToWs.get(to);
        if (targetWs) {
            targetWs.send(JSON.stringify(messageData));
        }
        // 发送给自己（确保发送者也能看到）
        ws.send(JSON.stringify(messageData));
    }
}

function handleImage(ws, data) {
    const clientInfo = clients.get(ws);
    if (!clientInfo || !clientInfo.username) return;

    const { to, imageData, filename } = data;
    const imageMessage = {
        type: 'image',
        from: clientInfo.username,
        to: to,
        imageData: imageData,
        timestamp: new Date().toISOString(),
        filename: filename || '图片'
    };

    console.log(`[${new Date().toLocaleTimeString()}] 图片发送 ${clientInfo.username} -> ${to}: ${filename || '未命名图片'}`);

    if (to === 'all') {
        broadcastToAll(imageMessage, ws);
    } else {
        const targetWs = usernameToWs.get(to);
        if (targetWs) {
            targetWs.send(JSON.stringify(imageMessage));
        }
        ws.send(JSON.stringify(imageMessage));
    }
}

function handleLogout(ws) {
    const clientInfo = clients.get(ws);
    if (clientInfo && clientInfo.username) {
        const username = clientInfo.username;

        // 移除映射
        usernameToWs.delete(username);

        // 广播用户下线
        broadcastToAll({
            type: 'user_offline',
            username: username,
            onlineUsers: getOnlineUsersExcluding(null)
        });

        console.log(`[${new Date().toLocaleTimeString()}] 用户下线: ${username}`);
    }
}

function broadcastToAll(data, excludeWs = null) {
    const message = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN && client !== excludeWs) {
            client.send(message);
        }
    });
}

function getOnlineUsersExcluding(excludeUsername) {
    const users = Array.from(usernameToWs.keys());
    if (excludeUsername) {
        return users.filter(user => user !== excludeUsername);
    }
    return users;
}

function generateConnectionId() {
    return Math.random().toString(36).substr(2, 9);
}

// 心跳检测
setInterval(() => {
    wss.clients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
        }
    });
}, 30000); // 每30秒发送一次心跳

// 启动HTTP服务器
server.listen(config.PORT, () => {
    console.log(`[${new Date().toLocaleTimeString()}] HTTP服务器运行在 http://localhost:${config.PORT}`);
    console.log(`[${new Date().toLocaleTimeString()}] WebSocket服务器运行在 ws://localhost:${config.WS_PORT}`);
    console.log('='.repeat(50));
});