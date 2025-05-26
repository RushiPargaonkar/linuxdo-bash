const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class ChatService {
  constructor() {
    this.dbPath = path.join(__dirname, '../database/chat.db');
    this.db = null;
  }

  /**
   * 初始化数据库
   */
  initDatabase() {
    return new Promise((resolve, reject) => {
      // 确保数据库目录存在
      const fs = require('fs');
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('数据库连接失败:', err);
          reject(err);
          return;
        }

        console.log('SQLite数据库连接成功');

        // 创建消息表
        this.db.run(`
          CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            message TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at INTEGER DEFAULT (strftime('%s', 'now'))
          )
        `, (err) => {
          if (err) {
            console.error('创建消息表失败:', err);
            reject(err);
          } else {
            console.log('消息表初始化完成');
            resolve();
          }
        });
      });
    });
  }

  /**
   * 保存聊天消息
   */
  saveMessage(username, message) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'));
        return;
      }

      const stmt = this.db.prepare(`
        INSERT INTO messages (username, message, timestamp, created_at)
        VALUES (?, ?, datetime('now'), strftime('%s', 'now'))
      `);

      stmt.run([username, message], function(err) {
        if (err) {
          console.error('保存消息失败:', err);
          reject(err);
        } else {
          const insertId = this.lastID;

          // 获取刚插入的消息
          this.db.get(`
            SELECT id, username, message, timestamp, created_at
            FROM messages
            WHERE id = ?
          `, [insertId], (err, row) => {
            if (err) {
              console.error('查询插入的消息失败:', err);
              reject(err);
            } else if (!row) {
              console.error('未找到插入的消息');
              reject(new Error('未找到插入的消息'));
            } else {
              resolve({
                id: row.id,
                username: row.username,
                message: row.message,
                timestamp: row.timestamp,
                createdAt: row.created_at * 1000 // 转换为毫秒
              });
            }
          });
        }
        stmt.finalize();
      }.bind(this));
    });
  }

  /**
   * 获取最近的聊天消息
   */
  getRecentMessages(limit = 50) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'));
        return;
      }

      this.db.all(`
        SELECT id, username, message, timestamp, created_at
        FROM messages
        ORDER BY created_at DESC
        LIMIT ?
      `, [limit], (err, rows) => {
        if (err) {
          console.error('获取消息失败:', err);
          reject(err);
        } else {
          const messages = rows.reverse().map(row => ({
            id: row.id,
            username: row.username,
            message: row.message,
            timestamp: row.timestamp,
            createdAt: row.created_at * 1000
          }));
          resolve(messages);
        }
      });
    });
  }

  /**
   * 清理旧消息（保留最近1000条）
   */
  cleanupOldMessages() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'));
        return;
      }

      this.db.run(`
        DELETE FROM messages
        WHERE id NOT IN (
          SELECT id FROM messages
          ORDER BY created_at DESC
          LIMIT 1000
        )
      `, (err) => {
        if (err) {
          console.error('清理旧消息失败:', err);
          reject(err);
        } else {
          console.log('旧消息清理完成');
          resolve();
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
          console.error('关闭数据库失败:', err);
        } else {
          console.log('数据库连接已关闭');
        }
      });
    }
  }
}

module.exports = ChatService;
