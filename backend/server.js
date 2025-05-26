const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const ContainerManager = require('./services/containerManager');
const ChatService = require('./services/chatService');
const TerminalService = require('./services/terminalService');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// 服务实例
const containerManager = new ContainerManager();
const chatService = new ChatService();
const terminalService = new TerminalService(containerManager);

// 初始化数据库
chatService.initDatabase();

// API路由
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await containerManager.getActiveUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Socket.IO连接处理
io.on('connection', (socket) => {
  console.log('用户连接:', socket.id);

  // 添加错误处理
  socket.on('error', (error) => {
    console.error('Socket错误:', error);
  });

  // 用户加入
  socket.on('join', async (data) => {
    try {
      const { username } = data;

      // 验证用户名
      if (!containerManager.validateUsername(username)) {
        socket.emit('error', { message: '用户名格式不正确' });
        return;
      }

      // 创建或获取容器
      const result = await containerManager.getOrCreateContainer(username);

      if (result.isNew) {
        // 新容器，发送创建进度
        socket.emit('container-creating', { message: '正在创建容器...' });

        // 模拟进度更新
        const progressSteps = [
          { progress: 20, message: '拉取Ubuntu镜像...' },
          { progress: 40, message: '创建容器...' },
          { progress: 60, message: '配置环境...' },
          { progress: 80, message: '启动服务...' },
          { progress: 100, message: '容器就绪!' }
        ];

        for (const step of progressSteps) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          socket.emit('container-progress', step);
        }
      }

      // 加入用户房间
      socket.join(username);
      socket.username = username;
      socket.containerId = result.containerId;

      // 创建终端会话
      const terminal = await terminalService.createTerminal(username, result.containerId);
      socket.terminalId = terminal.pid;

      // 绑定终端事件
      terminal.onData((data) => {
        try {
          console.log('Sending terminal output to client:', data);
          socket.emit('terminal-output', data);
          // 广播给其他用户（只读）
          socket.broadcast.emit('user-terminal-output', {
            username,
            data
          });
        } catch (error) {
          console.error('发送终端输出失败:', error);
        }
      });

      terminal.onExit(() => {
        try {
          socket.emit('terminal-exit');
        } catch (error) {
          console.error('发送终端退出事件失败:', error);
        }
      });

      socket.emit('container-ready', {
        containerId: result.containerId,
        username
      });

      // 通知其他用户
      socket.broadcast.emit('user-joined', { username });

    } catch (error) {
      console.error('用户加入失败:', error);
      socket.emit('error', { message: '创建容器失败: ' + error.message });
    }
  });

  // 终端输入
  socket.on('terminal-input', (data) => {
    if (socket.terminalId) {
      terminalService.writeToTerminal(socket.terminalId, data);
    }
  });

  // 终端调整大小
  socket.on('terminal-resize', (data) => {
    if (socket.terminalId) {
      terminalService.resizeTerminal(socket.terminalId, data.cols, data.rows);
    }
  });

  // 聊天消息
  socket.on('chat-message', async (data) => {
    try {
      const message = await chatService.saveMessage(socket.username, data.message);
      io.emit('chat-message', message);
    } catch (error) {
      socket.emit('error', { message: '发送消息失败' });
    }
  });

  // 获取聊天历史
  socket.on('get-chat-history', async () => {
    try {
      const messages = await chatService.getRecentMessages();
      socket.emit('chat-history', messages);
    } catch (error) {
      socket.emit('error', { message: '获取聊天记录失败' });
    }
  });

  // 断开连接
  socket.on('disconnect', () => {
    console.log('用户断开连接:', socket.id);

    if (socket.terminalId) {
      terminalService.closeTerminal(socket.terminalId);
    }

    if (socket.username) {
      socket.broadcast.emit('user-left', { username: socket.username });
    }
  });
});

// 定期清理过期容器
setInterval(async () => {
  try {
    await containerManager.cleanupExpiredContainers();
  } catch (error) {
    console.error('清理容器失败:', error);
  }
}, 5 * 60 * 1000); // 每5分钟检查一次

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`LinuxDo WebSSH服务器运行在端口 ${PORT}`);
});
