-- MCLauncher 数据库初始化脚本
CREATE DATABASE IF NOT EXISTS mclauncher CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'mclauncher'@'localhost' IDENTIFIED BY 'mclauncher';
GRANT ALL PRIVILEGES ON mclauncher.* TO 'mclauncher'@'localhost';
FLUSH PRIVILEGES;

USE mclauncher;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(32) NOT NULL UNIQUE,
    password_hash VARCHAR(128) NOT NULL,
    machine_id VARCHAR(64) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_machine_id (machine_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 机器码绑定表
CREATE TABLE IF NOT EXISTS machine_bindings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    machine_id VARCHAR(64) NOT NULL,
    username VARCHAR(32) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_machine_id (machine_id),
    UNIQUE INDEX ix_machine_user (machine_id, username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 登录Token表
CREATE TABLE IF NOT EXISTS login_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(512) NOT NULL UNIQUE,
    client_ip VARCHAR(45) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    INDEX idx_token (token),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 公告表
CREATE TABLE IF NOT EXISTS announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content VARCHAR(2000),
    important TINYINT DEFAULT 0,
    active TINYINT DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 反作弊日志表
CREATE TABLE IF NOT EXISTS anticheat_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(32) NOT NULL,
    client_ip VARCHAR(45) NOT NULL,
    violation_count INT DEFAULT 0,
    reason VARCHAR(200) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 插入默认公告
INSERT INTO announcements (title, content, important) VALUES
('欢迎使用 MCLauncher', '服务器已上线，欢迎各位玩家体验！', 1),
('版本更新 v1.0.0', 'Forge 1.20.1 模组服务器正式启动，请通过启动器登录游戏。', 0);
