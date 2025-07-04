const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
// const session = require('express-session');
// const passport = require('passport');

const ContainerManager = require('./services/containerManager');
const ChatService = require('./services/chatService');
const TerminalService = require('./services/terminalService');
const UserService = require('./services/userService');
// const LinuxDoStrategy = require('./auth/linuxdo-strategy');
// const oauthConfig = require('./config/oauth');
// const authRoutes = require('./routes/auth');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : [
      "http://localhost:5173",
      "http://localhost:3000",
      /^https:\/\/.*\.app\.github\.dev$/
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// 中间件
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : [
    "http://localhost:5173",
    "http://localhost:3000",
    /^https:\/\/.*\.app\.github\.dev$/
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Session配置 (注释掉OAuth相关)
// app.use(session({
//   secret: process.env.SESSION_SECRET || 'linuxdo-webssh-secret-key',
//   resave: false,
//   saveUninitialized: false,
//   cookie: {
//     secure: process.env.NODE_ENV === 'production',
//     maxAge: 24 * 60 * 60 * 1000 // 24小时
//   }
// }));

// Passport配置 (注释掉OAuth相关)
// app.use(passport.initialize());
// app.use(passport.session());

// 配置LinuxDo OAuth策略 (注释掉OAuth相关)
// passport.use(new LinuxDoStrategy(oauthConfig.linuxdo, (accessToken, refreshToken, profile, done) => {
//   // 这里可以保存用户信息到数据库
//   return done(null, profile);
// }));

// passport.serializeUser((user, done) => {
//   done(null, user);
// });

// passport.deserializeUser((user, done) => {
//   done(null, user);
// });

// 认证路由 (注释掉OAuth相关)
// app.use('/auth', authRoutes);

// 服务实例
const userService = new UserService();
const containerManager = new ContainerManager(userService);
const chatService = new ChatService();
const terminalService = new TerminalService(containerManager);

// 初始化数据库
chatService.initDatabase();

// 在线用户管理
const activeUsers = new Set();

// 获取在线用户列表
function getActiveUsersList() {
  const userList = Array.from(activeUsers);
  console.log('getActiveUsersList 被调用，当前用户:', userList);
  return userList;
}

// 广播用户列表更新
function broadcastUserList() {
  const userList = getActiveUsersList();
  console.log('广播用户列表:', userList);
  io.emit('user-list-updated', userList);
}

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
      const { username, password } = data;

      // 验证用户名
      if (!containerManager.validateUsername(username)) {
        socket.emit('error', { message: '用户名格式不正确' });
        return;
      }

      // 验证密码
      if (!password || password.length < 6) {
        socket.emit('error', { message: '密码必须至少6位字符' });
        return;
      }

      // 创建或获取容器（包含密码验证）
      const result = await containerManager.getOrCreateContainer(username, password);

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
        username,
        message: result.message
      });

      // 添加到在线用户列表
      console.log('用户加入前 activeUsers:', Array.from(activeUsers));
      activeUsers.add(username);
      console.log('用户加入后 activeUsers:', Array.from(activeUsers));

      // 通知其他用户有新用户加入
      socket.broadcast.emit('user-joined', { username });

      // 不在这里广播用户列表，等前端准备好后主动请求

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
      console.log('收到聊天消息:', { username: socket.username, message: data.message });

      // 检查用户是否已登录
      if (!socket.username) {
        console.error('用户未登录尝试发送消息');
        socket.emit('error', { message: '请先登录后再发送消息' });
        return;
      }

      // 检查消息内容
      if (!data.message || !data.message.trim()) {
        console.error('空消息内容');
        socket.emit('error', { message: '消息内容不能为空' });
        return;
      }

      // 检查防刷屏限制
      const rateLimitCheck = chatService.checkRateLimit(socket.username, data.message);
      if (!rateLimitCheck.allowed) {
        console.log('消息被防刷屏限制:', rateLimitCheck.reason);
        socket.emit('error', { message: rateLimitCheck.reason });
        return;
      }

      const message = await chatService.saveMessage(socket.username, data.message);
      console.log('消息保存成功，广播给所有用户:', message);
      io.emit('chat-message', message);
    } catch (error) {
      console.error('聊天消息处理失败:', error);
      socket.emit('error', { message: '发送消息失败: ' + error.message });
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

  // 点赞用户
  socket.on('like-user', async (data) => {
    try {
      const { targetUsername } = data;

      if (!socket.username) {
        socket.emit('error', { message: '请先登录' });
        return;
      }

      const likeRecord = await chatService.likeUser(socket.username, targetUsername);

      // 通知所有用户有新的点赞
      io.emit('user-liked', {
        fromUser: socket.username,
        toUser: targetUsername,
        timestamp: likeRecord.timestamp
      });

      // 获取更新后的点赞数
      const likesCount = await chatService.getUserLikesCount(targetUsername);

      // 通知所有用户更新点赞数
      io.emit('likes-updated', {
        username: targetUsername,
        likes: likesCount
      });

    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // 获取所有用户点赞数
  socket.on('get-all-likes', async () => {
    try {
      const allLikes = await chatService.getAllUsersLikesCount();
      socket.emit('all-likes', allLikes);
    } catch (error) {
      socket.emit('error', { message: '获取点赞数据失败' });
    }
  });

  // 处理来自WebSSH服务器的终端输出广播
  socket.on('broadcast-terminal-output', (data) => {
    // 广播给所有其他用户（除了发送者）
    socket.broadcast.emit('user-terminal-output', data);
  });

  // 获取在线用户列表
  socket.on('get-user-list', () => {
    const userList = getActiveUsersList();
    console.log('用户请求用户列表:', socket.username, '当前列表:', userList);

    // 强制广播给所有用户（包括请求者），确保完全同步
    io.emit('user-list-updated', userList);
    console.log('已广播用户列表给所有用户:', userList);
  });

  // 重置容器
  socket.on('reset-container', async (data) => {
    try {
      const { username } = data;

      if (username !== socket.username) {
        socket.emit('error', { message: '只能重置自己的容器' });
        return;
      }

      // 关闭当前终端
      if (socket.terminalId) {
        terminalService.closeTerminal(socket.terminalId);
        socket.terminalId = null;
      }

      // 重置容器
      const result = await containerManager.resetContainer(username);

      // 创建新的终端会话
      const terminal = await terminalService.createTerminal(username, result.containerId);
      socket.terminalId = terminal.pid;
      socket.containerId = result.containerId;

      // 绑定新终端事件
      terminal.onData((data) => {
        try {
          socket.emit('terminal-output', data);
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

      socket.emit('container-reset', {
        containerId: result.containerId,
        message: result.message
      });

      // 通知其他用户
      socket.broadcast.emit('user-container-reset', { username });

    } catch (error) {
      console.error('重置容器失败:', error);
      socket.emit('error', { message: '重置容器失败: ' + error.message });
    }
  });

  // 延长容器时间
  socket.on('extend-container', async (data) => {
    try {
      const { username } = data;

      if (username !== socket.username) {
        socket.emit('error', { message: '只能延长自己的容器时间' });
        return;
      }

      const result = await containerManager.extendContainer(username);

      socket.emit('container-extended', {
        message: result.message,
        newExpireTime: result.newExpireTime
      });

      // 通知其他用户
      socket.broadcast.emit('user-container-extended', { username });

    } catch (error) {
      console.error('延长容器时间失败:', error);
      socket.emit('error', { message: '延长容器时间失败: ' + error.message });
    }
  });

  // 心跳检测
  socket.on('ping', () => {
    socket.emit('pong');
  });

  // 断开连接
  socket.on('disconnect', () => {
    console.log('用户断开连接:', socket.id, socket.username);

    if (socket.terminalId) {
      terminalService.closeTerminal(socket.terminalId);
    }

    if (socket.username) {
      // 从在线用户列表中移除
      console.log('用户离开前 activeUsers:', Array.from(activeUsers));
      activeUsers.delete(socket.username);
      console.log('用户离开后 activeUsers:', Array.from(activeUsers));

      // 通知其他用户
      socket.broadcast.emit('user-left', { username: socket.username });

      // 广播更新后的用户列表
      broadcastUserList();
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
