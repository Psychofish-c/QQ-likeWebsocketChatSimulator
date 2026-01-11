class ChatApp {
    constructor() {
        this.ws = null;
        this.currentUser = null;
        this.currentSession = {
            key: 'group_all',
            type: 'group',
            name: '所有人'
        };

        // 在线用户列表
        this.onlineUsers = [];

        this.emojiList = [
            '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
            '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
            '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
            '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
            '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
            '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗',
            '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯',
            '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐',
            '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈',
            '👿', '👹', '👺', '💀', '☠️', '👻', '👽', '👾', '🤖', '💩',
            '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉',
            '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤙', '💪',
            '🦵', '🦶', '👂', '👃', '🧠', '👀', '👁️', '👅', '👄', '💋',
            '💘', '💝', '💖', '💗', '💓', '💞', '💕', '💟', '❣️', '💔',
            '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💯'
        ];

        this.init();
    }

    async init() {
        // 加载当前用户
        const userData = localStorage.getItem('currentUser');
        if (!userData) {
            window.location.href = 'index.html';
            return;
        }

        try {
            this.currentUser = JSON.parse(userData);
            console.log('currentUser:', this.currentUser);
            if (!this.currentUser || !this.currentUser.username) {
                console.error('currentUser格式错误:', this.currentUser);
                window.location.href = 'index.html';
                return;
            }
        } catch (error) {
            console.error('解析currentUser失败:', error);
            window.location.href = 'index.html';
            return;
        }

        document.getElementById('currentUsername').textContent = this.currentUser.username;

        // 初始化事件监听
        this.initEventListeners();

        // 初始化表情选择器
        this.initEmojiPicker();

        // 初始化默认会话
        this.switchToSession('group_all', '所有人', 'group');

        // 连接WebSocket
        this.connectWebSocket();
    }

    connectWebSocket() {
        console.log('尝试连接WebSocket...');
        this.ws = new WebSocket('ws://localhost:3001');

        this.ws.onopen = () => {
            console.log('WebSocket连接成功');
            // 发送登录消息
            this.ws.send(JSON.stringify({
                type: 'login',
                username: this.currentUser.username
            }));
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('收到服务器消息:', data);
                this.handleServerMessage(data);
            } catch (error) {
                console.error('解析消息错误:', error);
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket错误:', error);
        };

        this.ws.onclose = () => {
            console.log('WebSocket连接关闭');
            // 3秒后尝试重连
            setTimeout(() => this.connectWebSocket(), 3000);
        };
    }

    handleServerMessage(data) {
        switch (data.type) {
            case 'login':
                console.log('收到login消息:', data);
                if (data.success) {
                    this.updateOnlineUsers(data.onlineUsers);
                    this.clearInitialSystemMessages();
                    this.showLoginNotification();
                }
                break;

            case 'system':
                // 系统消息保存到群聊
                this.saveSystemMessage(data.message);
                break;

            case 'user_online':
                // 更新在线用户列表
                this.updateOnlineUsers(data.onlineUsers);
                // 保存系统消息
                this.saveSystemMessage(`${data.username} 上线了`);
                break;

            case 'user_offline':
                // 更新在线用户列表
                this.updateOnlineUsers(data.onlineUsers);
                // 保存系统消息
                this.saveSystemMessage(`${data.username} 下线了`);
                break;

            case 'message':
                this.handleIncomingMessage(data);
                break;

            case 'image':
                this.handleIncomingMessage(data);
                break;

            case 'ping':
                // 心跳响应
                this.ws.send(JSON.stringify({ type: 'pong' }));
                break;
        }
    }

    // 处理收到的聊天消息
    handleIncomingMessage(message) {
        console.log('处理收到的消息:', message);

        // 1. 确定这个消息属于哪个会话
        const sessionKey = this.getMessageSessionKey(message);
        console.log('消息属于会话:', sessionKey);

        // 2. 保存到本地存储
        this.saveMessageToSession(sessionKey, message);

        // 3. 如果当前正在看这个会话，且消息不是自己发的（避免重复显示），显示消息
        const isOwnMessage = message.from === this.currentUser.username;
        if (sessionKey === this.currentSession.key && !isOwnMessage) {
            console.log('当前会话，显示消息');
            this.displayMessage(message);
            this.scrollToBottom();
        } else if (!isOwnMessage) {
            // 4. 否则如果是别人发的消息，更新未读标记
            console.log('非当前会话，更新未读标记');
            this.updateUnreadBadge(sessionKey);
        }
    }

    // 获取消息的会话键值
    getMessageSessionKey(message) {
        if (message.to === 'all') {
            return 'group_all';
        }

        // 私聊消息：确定参与者
        let user1, user2;

        if (message.from === this.currentUser.username) {
            // 我发送的消息
            user1 = this.currentUser.username;
            user2 = message.to;
        } else {
            // 别人发给我的消息
            user1 = this.currentUser.username;
            user2 = message.from;
        }

        // 按字母顺序排序确保一致性
        const participants = [user1, user2].sort();
        return `private_${participants[0]}_${participants[1]}`;
    }

    // 保存消息到会话
    saveMessageToSession(sessionKey, message) {
        console.log('保存消息到会话:', sessionKey, message);

        // 添加必要字段
        const messageToSave = {
            ...message,
            timestamp: message.timestamp || new Date().toISOString(),
            type: message.type || 'message',
            read: message.from === this.currentUser.username ? true : false  // 自己发的消息标记为已读
        };

        // 保存到本地存储
        ChatUtils.saveMessageToLocal(sessionKey, messageToSave);

        // 更新会话列表
        this.updateSessionList();

        return true;
    }

    // 保存系统消息
    saveSystemMessage(text) {
        const message = {
            type: 'system',
            content: text,
            timestamp: new Date().toISOString()
        };

        // 系统消息只保存到群聊
        ChatUtils.saveMessageToLocal('group_all', message);

        // 如果当前在群聊，立即显示
        if (this.currentSession.key === 'group_all') {
            this.displayMessage(message);
            this.scrollToBottom();
        }
    }

    // 切换到指定会话
    switchToSession(sessionKey, sessionName, sessionType) {
        console.log('切换到会话:', sessionKey, sessionName, sessionType);

        // 更新当前会话
        this.currentSession = {
            key: sessionKey,
            name: sessionName,
            type: sessionType
        };

        // 更新界面
        this.updateSessionTitle();
        this.updateUserSelection();

        // 清空消息显示区
        this.clearMessageDisplay();

        // 加载会话消息
        this.loadSessionMessages();

        // 标记会话为已读
        ChatUtils.markSessionAsRead(sessionKey, this.currentUser.username);

        // 更新未读标记
        this.updateAllUnreadBadges();
    }

    // 更新会话标题
    updateSessionTitle() {
        const sessionTitle = document.getElementById('sessionTitle');
        const sessionType = document.getElementById('sessionType');

        if (this.currentSession.type === 'group') {
            sessionTitle.textContent = '群聊 - 所有人';
            sessionType.textContent = '群聊';
            sessionType.style.background = '#e3f2fd';
            sessionType.style.color = '#1976d2';
        } else {
            sessionTitle.textContent = `私聊 - ${this.currentSession.name}`;
            sessionType.textContent = '私聊';
            sessionType.style.background = '#f3e5f5';
            sessionType.style.color = '#7b1fa2';
        }
    }

    // 清空消息显示
    clearMessageDisplay() {
        const messagesDiv = document.getElementById('messages');
        messagesDiv.innerHTML = '';
    }

    // 加载会话消息
    loadSessionMessages() {
        const messages = ChatUtils.loadMessagesFromLocal(this.currentSession.key);
        console.log(`加载会话 ${this.currentSession.key} 的消息，共 ${messages.length} 条`);

        // 显示/隐藏空会话提示
        const emptySession = document.getElementById('emptySession');
        if (messages.length === 0) {
            emptySession.style.display = 'block';
        } else {
            emptySession.style.display = 'none';

            // 显示所有消息
            messages.forEach(msg => {
                this.displayMessage(msg);
            });

            this.scrollToBottom();
        }
    }

    // 显示单条消息
    displayMessage(message) {
        const messagesDiv = document.getElementById('messages');

        if (message.type === 'system') {
            // 系统消息
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message system';

            const time = ChatUtils.formatTime(message.timestamp);
            messageDiv.innerHTML = `
                <div class="system-content">
                    <span class="system-text">${message.content}</span>
                    <span class="system-time">${time}</span>
                </div>
            `;

            messagesDiv.appendChild(messageDiv);
        } else if (message.type === 'image') {
            // 图片消息
            const messageDiv = document.createElement('div');
            const isOwn = message.from === this.currentUser.username;
            const time = ChatUtils.formatTime(message.timestamp);

            messageDiv.className = `message ${isOwn ? 'own' : 'other'}`;
            messageDiv.innerHTML = `
                <div class="message-header">
                    <span class="message-sender">${message.from}</span>
                    <span class="message-time">${time}</span>
                </div>
                <div class="message-content">
                    <img src="${message.imageData}" alt="图片" class="chat-image" 
                         onclick="this.classList.toggle('expanded')">
                    <div class="image-info">${message.filename || '图片'}</div>
                </div>
            `;

            messagesDiv.appendChild(messageDiv);
        } else {
            // 文本或表情消息
            const messageDiv = document.createElement('div');
            const isOwn = message.from === this.currentUser.username;
            const time = ChatUtils.formatTime(message.timestamp);

            messageDiv.className = `message ${isOwn ? 'own' : 'other'}`;
            messageDiv.innerHTML = `
                <div class="message-header">
                    <span class="message-sender">${message.from}</span>
                    <span class="message-time">${time}</span>
                </div>
                <div class="message-content">
                    ${message.messageType === 'emoji' ?
                `<span class="emoji-message">${message.content}</span>` :
                message.content}
                </div>
            `;

            messagesDiv.appendChild(messageDiv);
        }
    }

    // 更新用户选择状态
    updateUserSelection() {
        const userItems = document.querySelectorAll('#userList li');
        userItems.forEach(item => {
            item.classList.remove('active');

            const text = item.textContent.replace(/[0-9+]/g, '').trim();
            if (this.currentSession.type === 'group' && text.includes('所有人')) {
                item.classList.add('active');
            } else if (this.currentSession.type === 'private' &&
                text.includes(this.currentSession.name)) {
                item.classList.add('active');
            }
        });
    }

    // 发送消息
    sendMessage() {
        const input = document.getElementById('messageInput');
        if (!input) return;

        const content = input.value.trim();

        if (!content || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        // 确定目标
        const target = this.currentSession.type === 'group' ? 'all' : this.currentSession.name;

        const message = {
            type: 'message',
            to: target,
            content: content,
            messageType: 'text',
            timestamp: new Date().toISOString()
        };

        console.log('发送消息:', message);

        // 发送到服务器
        this.ws.send(JSON.stringify(message));

        // 自己发送的消息，立即显示和保存
        const localMessage = {
            ...message,
            from: this.currentUser.username
        };

        const sessionKey = this.getMessageSessionKey(localMessage);
        
        // 立即显示
        if (sessionKey === this.currentSession.key) {
            this.displayMessage(localMessage);
            this.scrollToBottom();
        }
        
        // 保存到本地存储（标记为已读）
        this.saveMessageToSession(sessionKey, localMessage);

        input.value = '';
        input.focus();
    }

    // 发送图片
    sendImage(file) {
        if (!file || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        ChatUtils.imageToBase64(file).then(imageData => {
            // 确定目标
            const target = this.currentSession.type === 'group' ? 'all' : this.currentSession.name;

            const message = {
                type: 'image',
                to: target,
                imageData: imageData,
                filename: file.name,
                timestamp: new Date().toISOString()
            };

            console.log('发送图片:', message);
            this.ws.send(JSON.stringify(message));

            // 自己发送的图片，立即显示和保存
            const localMessage = {
                ...message,
                from: this.currentUser.username
            };

            const sessionKey = this.getMessageSessionKey(localMessage);
            
            // 立即显示
            if (sessionKey === this.currentSession.key) {
                this.displayMessage(localMessage);
                this.scrollToBottom();
            }
            
            // 保存到本地存储（标记为已读）
            this.saveMessageToSession(sessionKey, localMessage);
        });

        document.getElementById('imageInput').value = '';
    }

    // 发送表情
    sendEmoji(emoji) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        // 确定目标
        const target = this.currentSession.type === 'group' ? 'all' : this.currentSession.name;

        const message = {
            type: 'message',
            to: target,
            content: emoji,
            messageType: 'emoji',
            timestamp: new Date().toISOString()
        };

        console.log('发送表情:', message);
        this.ws.send(JSON.stringify(message));

        // 自己发送的表情，立即显示和保存
        const localMessage = {
            ...message,
            from: this.currentUser.username
        };

        const sessionKey = this.getMessageSessionKey(localMessage);
        
        // 立即显示
        if (sessionKey === this.currentSession.key) {
            this.displayMessage(localMessage);
            this.scrollToBottom();
        }
        
        // 保存到本地存储（标记为已读）
        this.saveMessageToSession(sessionKey, localMessage);

        // 隐藏表情选择器
        const emojiPicker = document.getElementById('emojiPicker');
        if (emojiPicker) {
            emojiPicker.style.display = 'none';
        }
    }

    // 获取未读标记HTML
    getUnreadBadgeHTML(sessionKey) {
        const unreadCount = ChatUtils.getUnreadCount(sessionKey, this.currentUser.username);
        if (unreadCount > 0) {
            return `<span class="unread-badge">${unreadCount > 9 ? '9+' : unreadCount}</span>`;
        }
        return '';
    }

    // 更新未读标记（特定会话）
    updateUnreadBadge(sessionKey) {
        // 重新渲染用户列表
        this.updateSessionList();
    }

    // 更新所有未读标记
    updateAllUnreadBadges() {
        // 更新会话列表
        this.updateSessionList();
    }

    // 切换到指定会话
    switchToSession(sessionKey, name, type) {
        console.log('切换到会话:', sessionKey, name, type);

        // 更新当前会话
        this.currentSession = {
            key: sessionKey,
            type: type,
            name: name
        };

        // 更新UI标题
        const sessionTitleEl = document.getElementById('sessionTitle');
        const sessionTypeEl = document.getElementById('sessionType');
        if (sessionTitleEl) {
            sessionTitleEl.textContent = `${type === 'group' ? '群聊' : '私聊'} - ${name}`;
        }
        if (sessionTypeEl) {
            sessionTypeEl.textContent = type === 'group' ? '群聊' : '私聊';
        }

        // 清除消息区域
        const messagesDiv = document.getElementById('messages');
        messagesDiv.innerHTML = '';

        // 隐藏空会话提示
        const emptySessionEl = document.getElementById('emptySession');
        if (emptySessionEl) {
            emptySessionEl.style.display = 'none';
        }

        // 加载并显示消息
        const messages = ChatUtils.loadMessagesFromLocal(sessionKey);
        console.log(`加载会话 ${sessionKey} 的消息:`, messages.length, '条');

        if (messages.length > 0) {
            messages.forEach(message => {
                this.displayMessage(message);
            });
            this.scrollToBottom();
        } else {
            // 显示空会话提示
            const emptySessionEl = document.getElementById('emptySession');
            if (emptySessionEl) {
                emptySessionEl.style.display = 'flex';
            }
        }

        // 标记为已读
        ChatUtils.markSessionAsRead(sessionKey, this.currentUser.username);

        // 更新UI
        this.updateUserSelection();
        this.updateAllUnreadBadges();
    }

    // 更新会话列表（新增的关键函数）
    updateSessionList() {
        try {
            console.log('updateSessionList called, currentUser:', this.currentUser, 'onlineUsers:', this.onlineUsers);

            // 获取所有会话
            const sessions = ChatUtils.getAllSessions(this.currentUser.username);
            console.log('sessions:', sessions);

            const userList = document.getElementById('userList');
            const onlineCount = document.getElementById('onlineCount');

            if (!userList || !onlineCount) {
                console.error('DOM elements not found: userList or onlineCount');
                return;
            }

            // 清空列表
            userList.innerHTML = '';

            // 统计在线用户
            const onlineUsers = this.onlineUsers.filter(u => u !== this.currentUser.username);
            onlineCount.textContent = onlineUsers.length + 1; // 包括自己

            console.log('filtered onlineUsers:', onlineUsers);

            // 添加群聊会话
            const groupSession = sessions.find(s => s.key === 'group_all') || {
                key: 'group_all',
                name: '所有人',
                type: 'group',
                unreadCount: 0
            };

            const isGroupSelected = this.currentSession.key === 'group_all';
            const groupItem = document.createElement('li');
            groupItem.className = isGroupSelected ? 'active' : '';
            groupItem.innerHTML = `
                <i class="fas fa-users"></i> 所有人
                ${groupSession.unreadCount > 0 ?
                `<span class="unread-badge">${groupSession.unreadCount > 9 ? '9+' : groupSession.unreadCount}</span>` :
                ''}
            `;
            groupItem.onclick = () => this.switchToSession('group_all', '所有人', 'group');
            userList.appendChild(groupItem);
            console.log('添加了群聊会话');

            // 添加在线用户的私聊会话
            onlineUsers.forEach(username => {
                const sessionKey = ChatUtils.generatePrivateSessionKey(this.currentUser.username, username);
                const existingSession = sessions.find(s => s.key === sessionKey);

                const unreadCount = existingSession ?
                    ChatUtils.getUnreadCount(sessionKey, this.currentUser.username) : 0;
                const isSelected = this.currentSession.key === sessionKey;

                const userItem = document.createElement('li');
                userItem.className = isSelected ? 'active' : '';
                userItem.innerHTML = `
                    <i class="fas fa-user"></i> ${username}
                    ${unreadCount > 0 ?
                    `<span class="unread-badge">${unreadCount > 9 ? '9+' : unreadCount}</span>` :
                    ''}
                `;
                userItem.onclick = () => this.switchToSession(
                    sessionKey,
                    username,
                    'private'
                );
                userList.appendChild(userItem);
                console.log('添加了私聊会话:', username);
            });

            console.log('updateSessionList completed, userList children:', userList.children.length);
        } catch (error) {
            console.error('updateSessionList error:', error);
        }
    }

    // 更新在线用户列表（新增的关键函数）
    updateOnlineUsers(users) {
        console.log('updateOnlineUsers called with users:', users);
        this.onlineUsers = users || [];
        console.log('this.onlineUsers set to:', this.onlineUsers);
        this.updateSessionList();
    }

    scrollToBottom() {
        const messagesContainer = document.querySelector('.messages-container');
        if (messagesContainer) {
            setTimeout(() => {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, 100);
        }
    }

    clearInitialSystemMessages() {
        const systemMessages = document.querySelectorAll('.message.system');
        systemMessages.forEach(msg => {
            if (msg.textContent.includes('连接成功，请先登录')) {
                msg.remove();
            }
        });
    }

    showLoginNotification() {
        const notification = document.createElement('div');
        notification.className = 'login-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-check-circle"></i>
                <span>登录成功！欢迎 ${this.currentUser.username}</span>
            </div>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    initEventListeners() {
        // 发送消息
        const sendBtn = document.getElementById('sendBtn');
        const messageInput = document.getElementById('messageInput');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }
        if (messageInput) {
            messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        // 表情按钮
        const emojiBtn = document.getElementById('emojiBtn');
        const emojiPicker = document.getElementById('emojiPicker');

        if (emojiBtn && emojiPicker) {
            emojiBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (emojiPicker.style.display === 'block') {
                    emojiPicker.style.display = 'none';
                } else {
                    emojiPicker.style.display = 'block';
                    // 定位
                    emojiPicker.style.bottom = '100%';
                    emojiPicker.style.left = '15px';
                    emojiPicker.style.right = '15px';
                }
            });
        }

        // 点击其他地方隐藏表情选择器
        document.addEventListener('click', (e) => {
            if (emojiPicker && !e.target.closest('#emojiPicker') && !e.target.closest('#emojiBtn')) {
                emojiPicker.style.display = 'none';
            }
        });

        // 图片按钮
        const imageBtn = document.getElementById('imageBtn');
        const imageInput = document.getElementById('imageInput');
        if (imageBtn && imageInput) {
            imageBtn.addEventListener('click', () => {
                imageInput.click();
            });

            imageInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    if (file.size > 5 * 1024 * 1024) {
                        alert('图片大小不能超过5MB');
                        return;
                    }
                    this.sendImage(file);
                }
            });
        }

        // 导出聊天记录
        const exportChatBtn = document.getElementById('exportChatBtn');
        if (exportChatBtn) {
            exportChatBtn.addEventListener('click', () => {
                const messages = ChatUtils.loadMessagesFromLocal(this.currentSession.key);
                ChatUtils.exportChatHistory(messages, `${this.currentSession.name}_chat_history`);
            });
        }

        // 导入聊天记录
        const importChatBtn = document.getElementById('importChatBtn');
        const importFile = document.getElementById('importFile');
        if (importChatBtn && importFile) {
            importChatBtn.addEventListener('click', () => {
                importFile.click();
            });

            importFile.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    try {
                        const messages = await ChatUtils.importChatHistory(file);
                        // 将导入的消息添加到当前会话
                        messages.forEach(msg => {
                            ChatUtils.saveMessageToLocal(this.currentSession.key, msg);
                            this.displayMessage(msg);
                        });
                        alert(`成功导入 ${messages.length} 条消息`);
                        this.scrollToBottom();
                    } catch (error) {
                        alert('导入失败: ' + error.message);
                    }
                }
                e.target.value = '';
            });
        }

        // 退出登录
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                    this.ws.send(JSON.stringify({ type: 'logout' }));
                    this.ws.close();
                }
                localStorage.removeItem('currentUser');
                window.location.href = 'index.html';
            });
        }
    }

    initEmojiPicker() {
        const picker = document.getElementById('emojiPicker');
        if (!picker) return;

        picker.innerHTML = '';

        // 分组显示表情
        const emojiGroups = [
            { name: '常用', emojis: this.emojiList.slice(0, 32) },
            { name: '表情', emojis: this.emojiList.slice(32, 64) },
            { name: '手势', emojis: this.emojiList.slice(64, 80) },
            { name: '其他', emojis: this.emojiList.slice(80) }
        ];

        emojiGroups.forEach(group => {
            if (group.emojis.length === 0) return;

            const groupDiv = document.createElement('div');
            groupDiv.className = 'emoji-category';

            const title = document.createElement('div');
            title.className = 'emoji-category-title';
            title.textContent = group.name;
            groupDiv.appendChild(title);

            const container = document.createElement('div');
            container.className = 'emoji-container';

            group.emojis.forEach(emoji => {
                const span = document.createElement('span');
                span.className = 'emoji-item';
                span.textContent = emoji;
                span.onclick = () => this.sendEmoji(emoji);
                container.appendChild(span);
            });

            groupDiv.appendChild(container);
            picker.appendChild(groupDiv);
        });
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.chatApp = new ChatApp();
});