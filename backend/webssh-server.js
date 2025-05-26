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
        <script src="https://cdn.jsdelivr.net/npm/xterm@4.19.0/lib/xterm.min.js"></script>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/xterm@4.19.0/css/xterm.css" />
        <style>
            body {
                margin: 0;
                padding: 0;
                background: #000;
                font-family: monospace;
            }
            #terminal {
                width: 100vw;
                height: 100vh;
            }
        </style>
    </head>
    <body>
        <div id="terminal"></div>
        <script>
            const socket = io();
            const terminal = new Terminal({
                fontSize: 14,
                fontFamily: 'monospace',
                theme: {
                    background: '#000000',
                    foreground: '#ffffff'
                },
                cursorBlink: true,
                convertEol: true,
                scrollback: 1000,
                tabStopWidth: 4
            });

            terminal.open(document.getElementById('terminal'));

            // 连接到容器
            socket.emit('create-terminal', { username: '${username}' });

            // 处理终端输出
            socket.on('terminal-output', (data) => {
                terminal.write(data);
            });

            // 处理用户输入
            terminal.onData((data) => {
                socket.emit('terminal-input', data);
            });

            // 处理终端大小调整
            terminal.onResize((size) => {
                socket.emit('terminal-resize', size);
            });

            // 初始化大小
            setTimeout(() => {
                terminal.fit();
            }, 100);
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
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd: process.env.HOME,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor'
        }
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
