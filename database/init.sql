-- database/init.sql
CREATE DATABASE IF NOT EXISTS web_chat DEFAULT CHARACTER SET utf8mb4;

USE web_chat;

-- 用户表
CREATE TABLE users (
                       id INT AUTO_INCREMENT PRIMARY KEY,
                       username VARCHAR(50) UNIQUE NOT NULL,
                       password VARCHAR(100) NOT NULL,
                       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                       last_login TIMESTAMP NULL
);

-- 插入测试用户（密码都是123456的md5值）
INSERT INTO users (username, password) VALUES
('user1', 'e10adc3949ba59abbe56e057f20f883e'),
('user2', 'e10adc3949ba59abbe56e057f20f883e'),
('user3', 'e10adc3949ba59abbe56e057f20f883e');