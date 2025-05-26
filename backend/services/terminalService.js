const pty = require('node-pty');
const Docker = require('dockerode');

class TerminalService {
  constructor() {
    this.docker = new Docker();
    this.terminals = new Map();
  }

  /**
   * 创建终端会话 - 使用node-pty直接连接到容器
   */
  async createTerminal(username, containerId) {
    try {
      console.log(`创建终端会话: ${username}, 容器: ${containerId}`);

      // 使用容器名称而不是ID，因为我们知道容器名称格式
      const containerName = `linuxdo-${username}`;

      // 使用node-pty创建一个伪终端，直接执行docker exec
      const terminal = pty.spawn('docker', [
        'exec', '-it', containerName, '/bin/bash'
      ], {
        name: 'xterm-color',
        cols: 80,
        rows: 24,
        cwd: process.env.HOME,
        env: process.env
      });

      const terminalSession = {
        pid: terminal.pid,
        terminal: terminal,
        write: (data) => {
          terminal.write(data);
        },
        onData: (callback) => {
          terminal.on('data', callback);
        },
        onExit: (callback) => {
          terminal.on('exit', callback);
        },
        resize: (cols, rows) => {
          terminal.resize(cols, rows);
        },
        kill: () => {
          terminal.kill();
        }
      };

      this.terminals.set(terminal.pid, terminalSession);

      // 发送欢迎消息
      setTimeout(() => {
        terminal.write('clear\n');
        terminal.write('echo "🎉 欢迎来到LinuxDo自习室！"\n');
        terminal.write('echo "📁 你现在在一个独立的Ubuntu 22.04容器中"\n');
        terminal.write('echo "🔧 可以自由安装软件包和进行实验"\n');
        terminal.write('echo "⏰ 容器将在2小时后自动销毁"\n');
        terminal.write(`echo "👤 当前用户: ${username}"\n`);
        terminal.write('pwd\n');
      }, 1000);

      console.log(`终端会话创建成功: ${terminal.pid}`);
      return terminalSession;
    } catch (error) {
      console.error('创建终端失败:', error);
      throw new Error('终端创建失败: ' + error.message);
    }
  }

  /**
   * 获取终端会话
   */
  getTerminal(terminalId) {
    return this.terminals.get(terminalId);
  }

  /**
   * 写入数据到终端
   */
  writeToTerminal(terminalId, data) {
    const terminal = this.terminals.get(terminalId);
    if (terminal) {
      console.log(`写入终端 ${terminalId}:`, data);
      terminal.write(data);
    }
  }

  /**
   * 调整终端大小
   */
  resizeTerminal(terminalId, cols, rows) {
    const terminal = this.terminals.get(terminalId);
    if (terminal) {
      console.log(`调整终端大小 ${terminalId}: ${cols}x${rows}`);
      terminal.resize(cols, rows);
    }
  }

  /**
   * 关闭终端会话
   */
  closeTerminal(terminalId) {
    const terminal = this.terminals.get(terminalId);
    if (terminal) {
      console.log(`关闭终端会话: ${terminalId}`);
      terminal.kill();
      this.terminals.delete(terminalId);
    }
  }

  /**
   * 清理所有终端会话
   */
  cleanup() {
    console.log('清理所有终端会话');
    for (const [terminalId, terminal] of this.terminals) {
      terminal.kill();
    }
    this.terminals.clear();
  }
}

module.exports = TerminalService;
