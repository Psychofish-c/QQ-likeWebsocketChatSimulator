// server/db.js
const mysql = require('mysql');
const config = require('./config');

const pool = mysql.createPool(config.DB_CONFIG);

const db = {
    query(sql, params) {
        return new Promise((resolve, reject) => {
            pool.query(sql, params, (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });
    },

    // 用户相关操作
    async findUser(username) {
        const sql = 'SELECT * FROM users WHERE username = ?';
        const results = await this.query(sql, [username]);
        return results[0];
    },

    async createUser(username, password) {
        const sql = 'INSERT INTO users (username, password) VALUES (?, ?)';
        const result = await this.query(sql, [username, password]);
        return result.insertId;
    },

    async updateLastLogin(username) {
        const sql = 'UPDATE users SET last_login = NOW() WHERE username = ?';
        await this.query(sql, [username]);
    }
};

module.exports = db;