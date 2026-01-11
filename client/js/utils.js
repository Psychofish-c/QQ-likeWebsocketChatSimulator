// Base64编解码工具
const ChatUtils = {
    // 编码消息为Base64
    encodeMessage(message) {
        const str = JSON.stringify(message);
        return btoa(unescape(encodeURIComponent(str)));
    },

    // 解码Base64为消息
    decodeMessage(base64) {
        try {
            const str = decodeURIComponent(escape(atob(base64)));
            return JSON.parse(str);
        } catch (error) {
            console.error('解码错误:', error);
            return null;
        }
    },

    // 图片转Base64
    imageToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    // 保存聊天记录到本地文件
    exportChatHistory(messages, filename = 'chat_history') {
        const data = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            messages: messages.map(msg => this.encodeMessage(msg))
        };

        const content = JSON.stringify(data, null, 2);
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}_${new Date().getTime()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // 从本地文件导入聊天记录
    importChatHistory(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (data.version === '1.0' && Array.isArray(data.messages)) {
                        const messages = data.messages
                            .map(base64 => this.decodeMessage(base64))
                            .filter(msg => msg !== null);
                        resolve(messages);
                    } else {
                        reject(new Error('文件格式不正确'));
                    }
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    },

    // 格式化时间
    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    },

    // 从本地存储加载消息（按会话）
    loadMessagesFromLocal(sessionKey) {
        const key = `chat_session_${sessionKey}`;
        return JSON.parse(localStorage.getItem(key) || '[]');
    },

    // 生成私聊会话键值（核心修复！）
    generatePrivateSessionKey(user1, user2) {
        const participants = [user1, user2].sort();
        return `private_${participants[0]}_${participants[1]}`;
    },

    // 生成会话键值
    generateSessionKey(currentUser, targetUser) {
        if (targetUser === 'all') {
            return 'group_all';
        }
        return this.generatePrivateSessionKey(currentUser, targetUser);
    },

    getMessageSessionKey(message, currentUser) {
        console.log('获取消息会话键:', message, '当前用户:', currentUser);

        if (message.to === 'all') {
            return 'group_all';
        }

        // 私聊消息：确保顺序一致
        let user1, user2;

        if (message.from === currentUser) {
            // 我发送的消息
            user1 = currentUser;
            user2 = message.to;
        } else {
            // 别人发给我的消息
            user1 = currentUser;
            user2 = message.from;
        }

        return this.generatePrivateSessionKey(user1, user2);
    },

    // 数据迁移（从旧版本升级）
    migrateOldMessages() {
        const oldKey = 'chat_messages';
        const oldMessages = localStorage.getItem(oldKey);

        if (oldMessages) {
            try {
                const messages = JSON.parse(oldMessages);
                console.log(`发现 ${messages.length} 条旧消息，开始迁移...`);

                const currentUser = localStorage.getItem('currentUser');
                const user = currentUser ? JSON.parse(currentUser) : null;
                const username = user ? user.username : 'unknown';

                messages.forEach(msg => {
                    const sessionKey = this.getMessageSessionKey(msg, username);
                    this.saveMessageToLocal(sessionKey, msg);
                });

                // 删除旧数据
                localStorage.removeItem(oldKey);
                console.log('消息迁移完成！');

            } catch (error) {
                console.error('消息迁移失败:', error);
            }
        }
    },

    // 获取所有会话列表
    getAllSessions(currentUser) {
        const sessions = [];

        // 添加群聊会话
        const groupMessages = this.loadMessagesFromLocal('group_all');
        sessions.push({
            key: 'group_all',
            name: '所有人',
            type: 'group',
            unreadCount: this.getUnreadCount('group_all', currentUser),
            lastMessage: groupMessages.length > 0 ? groupMessages[groupMessages.length - 1] : null
        });

        // 获取所有私聊会话
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('chat_session_private_')) {
                const sessionKey = key.replace('chat_session_', '');
                const users = sessionKey.replace('private_', '').split('_');

                // 确保当前用户参与了这个会话
                if (users.includes(currentUser)) {
                    const otherUser = users.find(u => u !== currentUser);
                    const messages = this.loadMessagesFromLocal(sessionKey);

                    if (messages.length > 0) {
                        sessions.push({
                            key: sessionKey,
                            type: 'private',
                            name: otherUser,
                            participants: users,
                            unreadCount: this.getUnreadCount(sessionKey, currentUser),
                            lastMessage: messages[messages.length - 1]
                        });
                    }
                }
            }
        });

        return sessions;
    },
    getUnreadCount(sessionKey, currentUser) {
        const messages = this.loadMessagesFromLocal(sessionKey);
        return messages.filter(msg =>
            msg.from !== currentUser &&
            !msg.read
        ).length;
    },
    markSessionAsRead(sessionKey, currentUser) {
        const messages = this.loadMessagesFromLocal(sessionKey);
        const updatedMessages = messages.map(msg => {
            if (msg.from !== currentUser && !msg.read) {
                return { ...msg, read: true };
            }
            return msg;
        });

        if (updatedMessages.length > 0) {
            localStorage.setItem(`chat_session_${sessionKey}`, JSON.stringify(updatedMessages));
        }
    },

    // 获取会话的最后一条消息
    getLastMessage(sessionKey) {
        const messages = this.loadMessagesFromLocal(sessionKey);
        return messages.length > 0 ? messages[messages.length - 1] : null;
    },

    saveMessageToLocal(sessionKey, message) {
        const key = `chat_session_${sessionKey}`;
        let messages = JSON.parse(localStorage.getItem(key) || '[]');

        // 检查是否已存在相同的消息（基于发送者、内容和图片数据）
        const exists = messages.some(existing =>
            existing.from === message.from &&
            existing.content === message.content &&
            existing.imageData === message.imageData &&
            existing.type === message.type
        );

        if (!exists) {
            console.log('保存新消息到会话:', sessionKey, message);
            messages.push(message);

            // 按时间排序
            messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            // 只保留最近的500条消息
            if (messages.length > 500) {
                messages = messages.slice(-500);
            }

            localStorage.setItem(key, JSON.stringify(messages));
        } else {
            console.log('消息已存在，跳过保存');
        }
    },
    getAllUnreadCount(currentUser) {
        const sessions = this.getAllSessions(currentUser);
        return sessions.reduce((total, session) => {
            return total + this.getUnreadCount(session.key, currentUser);
        }, 0);
    }
};

// 页面加载时执行数据迁移
document.addEventListener('DOMContentLoaded', () => {
    ChatUtils.migrateOldMessages();
});
// 在 utils.js 中添加以下方法

// 会话管理器
const SessionManager = {
    // 获取或创建会话
    getSession(currentUser, targetUser) {
        const sessionKey = this.generateSessionKey(currentUser, targetUser);
        let session = this.getSessionByKey(sessionKey);

        if (!session) {
            session = {
                key: sessionKey,
                type: targetUser === 'all' ? 'group' : 'private',
                name: targetUser === 'all' ? '所有人' : targetUser,
                participants: targetUser === 'all' ? ['all'] :
                    [currentUser, targetUser].sort(),
                created: new Date().toISOString(),
                lastMessageTime: null
            };
            this.saveSession(session);
        }

        return session;
    },

    // 生成会话键值（确保一致性）
    generateSessionKey(currentUser, targetUser) {
        if (targetUser === 'all') {
            return 'group_all';
        }

        // 私聊会话键值：按字母排序确保一致性
        const participants = [currentUser, targetUser].sort();
        return `private_${participants[0]}_${participants[1]}`;
    },

    // 获取消息的会话键值
    getMessageSessionKey(message, currentUser) {
        if (message.to === 'all') {
            return 'group_all';
        }

        // 确定参与者
        let user1, user2;
        if (message.from === currentUser) {
            user1 = currentUser;
            user2 = message.to;
        } else {
            user1 = currentUser;
            user2 = message.from;
        }

        const participants = [user1, user2].sort();
        return `private_${participants[0]}_${participants[1]}`;
    },

    // 获取所有会话
    getAllSessions(currentUser) {
        const sessions = [];

        // 总是包含群聊
        const groupSession = {
            key: 'group_all',
            type: 'group',
            name: '所有人',
            participants: ['all'],
            unreadCount: 0,
            lastMessage: null
        };
        const groupMessages = this.loadMessagesFromLocal('group_all');
        if (groupMessages.length > 0) {
            groupSession.lastMessage = groupMessages[groupMessages.length - 1];
            groupSession.unreadCount = this.getUnreadCount('group_all', currentUser);
        }
        sessions.push(groupSession);

        // 获取所有私聊会话
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('chat_session_private_')) {
                const sessionKey = key.replace('chat_session_', '');
                const users = sessionKey.replace('private_', '').split('_');

                // 确保当前用户参与了这个会话
                if (users.includes(currentUser)) {
                    const otherUser = users.find(u => u !== currentUser);
                    const messages = this.loadMessagesFromLocal(sessionKey);

                    if (messages.length > 0) {
                        sessions.push({
                            key: sessionKey,
                            type: 'private',
                            name: otherUser,
                            participants: users,
                            unreadCount: this.getUnreadCount(sessionKey, currentUser),
                            lastMessage: messages[messages.length - 1]
                        });
                    }
                }
            }
        });

        // 按最后消息时间排序
        sessions.sort((a, b) => {
            const timeA = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : 0;
            const timeB = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : 0;
            return timeB - timeA;
        });

        return sessions;
    },

    // 保存会话
    saveSession(session) {
        const key = `session_info_${session.key}`;
        localStorage.setItem(key, JSON.stringify(session));
    },

    // 获取会话信息
    getSessionByKey(sessionKey) {
        const key = `session_info_${sessionKey}`;
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    },

    // 更新会话最后消息时间
    updateSessionLastMessage(sessionKey, message) {
        const session = this.getSessionByKey(sessionKey);
        if (session) {
            session.lastMessageTime = message.timestamp;
            session.lastMessage = message;
            this.saveSession(session);
        }
    },

    // 标记会话为已读
    markSessionAsRead(sessionKey, currentUser) {
        const messages = this.loadMessagesFromLocal(sessionKey);
        const updatedMessages = messages.map(msg => {
            if (msg.from !== currentUser && !msg.read) {
                return { ...msg, read: true };
            }
            return msg;
        });

        if (updatedMessages.length > 0) {
            localStorage.setItem(`chat_session_${sessionKey}`, JSON.stringify(updatedMessages));
        }
    },

    // 获取未读消息数
    getUnreadCount(sessionKey, currentUser) {
        const messages = this.loadMessagesFromLocal(sessionKey);
        return messages.filter(msg =>
            msg.from !== currentUser &&
            !msg.read
        ).length;
    },

    // 加载消息
    loadMessagesFromLocal(sessionKey) {
        const key = `chat_session_${sessionKey}`;
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    }
};

// 合并到 ChatUtils
Object.assign(ChatUtils, SessionManager);