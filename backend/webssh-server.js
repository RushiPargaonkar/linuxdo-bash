const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const pty = require('node-pty');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 中间件
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// 存储终端会话
const terminals = {};

// 提供简单的webssh页面
app.get('/ssh', (req, res) => {
  const { username } = req.query;

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>WebSSH Terminal</title>
        <script src="/socket.io/socket.io.js"></script>
        <style>
            body {
                margin: 0;
                padding: 0;
                background: #000;
                font-family: 'Courier New', monospace;
                color: #fff;
            }
            #terminal {
                width: 100vw;
                height: 100vh;
                padding: 10px;
                box-sizing: border-box;
                white-space: pre-wrap;
                overflow-y: auto;
                font-size: 14px;
                line-height: 1.2;
            }
            #input {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: #000;
                border: none;
                color: #fff;
                padding: 10px;
                font-family: 'Courier New', monospace;
                font-size: 14px;
                outline: none;
            }
        </style>
    </head>
    <body>
        <div id="terminal">正在连接到容器...</div>
        <input id="input" type="text" placeholder="输入命令..." />
        <script>
            const socket = io();
            const terminal = document.getElementById('terminal');
            const input = document.getElementById('input');

            // 连接到容器
            socket.emit('create-terminal', { username: '${username}' });

            // 处理终端输出
            socket.on('terminal-output', (data) => {
                terminal.textContent += data;
                terminal.scrollTop = terminal.scrollHeight;
            });

            // 处理用户输入
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const command = input.value + '\\n';
                    socket.emit('terminal-input', command);
                    input.value = '';
                } else if (e.key === 'Backspace') {
                    // 发送退格键
                    socket.emit('terminal-input', '\\b');
                }
            });

            input.addEventListener('input', (e) => {
                const lastChar = e.data;
                if (lastChar && lastChar !== '\\n') {
                    socket.emit('terminal-input', lastChar);
                }
            });

            // 聚焦输入框
            input.focus();
        </script>
    </body>
    </html>
  `);
});

// Socket.IO 连接处理
io.on('connection', (socket) => {
  console.log('WebSSH client connected');

  socket.on('create-terminal', ({ username }) => {
    console.log('Creating terminal for user:', username);

    try {
      // 直接连接到容器
      const containerName = `linuxdo-${username}`;

      const terminal = pty.spawn('docker', [
        'exec', '-it', containerName, '/bin/bash'
      ], {
        name: 'xterm-color',
        cols: 80,
        rows: 24,
        cwd: process.env.HOME,
        env: process.env
      });

      terminals[socket.id] = terminal;

      // 发送终端输出到客户端
      terminal.on('data', (data) => {
        socket.emit('terminal-output', data);
      });

      // 处理终端退出
      terminal.on('exit', () => {
        socket.emit('terminal-exit');
        delete terminals[socket.id];
      });

      // 发送欢迎消息
      setTimeout(() => {
        terminal.write('clear\\n');
        terminal.write('echo "🎉 欢迎来到LinuxDo自习室！"\\n');
        terminal.write('echo "📁 你现在在一个独立的Ubuntu 22.04容器中"\\n');
        terminal.write('pwd\\n');
      }, 1000);

    } catch (error) {
      console.error('Failed to create terminal:', error);
      socket.emit('terminal-error', error.message);
    }
  });

  socket.on('terminal-input', (data) => {
    const terminal = terminals[socket.id];
    if (terminal) {
      terminal.write(data);
    }
  });

  socket.on('terminal-resize', ({ cols, rows }) => {
    const terminal = terminals[socket.id];
    if (terminal) {
      terminal.resize(cols, rows);
    }
  });

  socket.on('disconnect', () => {
    console.log('WebSSH client disconnected');
    const terminal = terminals[socket.id];
    if (terminal) {
      terminal.kill();
      delete terminals[socket.id];
    }
  });
});

const PORT = 3002;
server.listen(PORT, () => {
  console.log(`WebSSH server running on port ${PORT}`);
});
