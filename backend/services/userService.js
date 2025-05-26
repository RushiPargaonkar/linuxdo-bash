const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

class UserService {
  constructor() {
    this.db = null;
    this.initDatabase();
  }

  initDatabase() {
    const dbPath = path.join(__dirname, '../data/users.db');
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('用户数据库连接失败:', err.message);
      } else {
        console.log('用户数据库连接成功');
        this.createTables();
      }
    });
  }

  createTables() {
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        container_id TEXT,
        container_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1
      )
    `;

    this.db.run(createUsersTable, (err) => {
      if (err) {
        console.error('创建用户表失败:', err.message);
      } else {
        console.log('用户表初始化完成');
      }
    });
  }

  /**
   * 检查用户是否已存在
   */
  async userExists(username) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM users WHERE username = ?';
      this.db.get(query, [username], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(!!row);
        }
      });
    });
  }

  /**
   * 获取用户信息
   */
  async getUser(username) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM users WHERE username = ?';
      this.db.get(query, [username], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * 创建新用户
   */
  async createUser(username, password, containerId, containerName) {
    return new Promise(async (resolve, reject) => {
      try {
        // 加密密码
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        const query = `
          INSERT INTO users (username, password_hash, container_id, container_name, created_at, last_login)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;

        this.db.run(query, [username, passwordHash, containerId, containerName], function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({
              id: this.lastID,
              username,
              containerId,
              containerName
            });
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 验证用户密码
   */
  async verifyPassword(username, password) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT password_hash FROM users WHERE username = ?';
      this.db.get(query, [username], async (err, row) => {
        if (err) {
          reject(err);
        } else if (!row) {
          resolve(false); // 用户不存在
        } else {
          try {
            const isValid = await bcrypt.compare(password, row.password_hash);
            resolve(isValid);
          } catch (error) {
            reject(error);
          }
        }
      });
    });
  }

  /**
   * 更新用户最后登录时间
   */
  async updateLastLogin(username) {
    return new Promise((resolve, reject) => {
      const query = 'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE username = ?';
      this.db.run(query, [username], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });
    });
  }

  /**
   * 获取所有用户列表
   */
  async getAllUsers() {
    return new Promise((resolve, reject) => {
      const query = 'SELECT username, created_at, last_login, is_active FROM users ORDER BY last_login DESC';
      this.db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * 获取活跃用户数量
   */
  async getActiveUserCount() {
    return new Promise((resolve, reject) => {
      const query = 'SELECT COUNT(*) as count FROM users WHERE is_active = 1';
      this.db.get(query, [], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row.count);
        }
      });
    });
  }

  /**
   * 设置用户状态
   */
  async setUserActive(username, isActive) {
    return new Promise((resolve, reject) => {
      const query = 'UPDATE users SET is_active = ? WHERE username = ?';
      this.db.run(query, [isActive ? 1 : 0, username], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });
    });
  }

  /**
   * 删除用户（谨慎使用）
   */
  async deleteUser(username) {
    return new Promise((resolve, reject) => {
      const query = 'DELETE FROM users WHERE username = ?';
      this.db.run(query, [username], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });
    });
  }

  /**
   * 关闭数据库连接
   */
  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('关闭用户数据库失败:', err.message);
        } else {
          console.log('用户数据库连接已关闭');
        }
      });
    }
  }
}

module.exports = UserService;
