// server/config.js
module.exports = {
    PORT: 3000,
    WS_PORT: 3001,
    DB_CONFIG: {
        host: 'localhost',
        user: 'root',
        password: '', // 改为你的MySQL密码
        database: 'web_chat',
        port: 3306
    }
};