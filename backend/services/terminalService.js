const pty = require('node-pty');

class TerminalService {
  constructor(containerManager) {
    this.containerManager = containerManager;
    this.terminals = new Map(); // terminalId -> pty instance
  }

  /**
   * 创建终端会话
   */
  async createTerminal(username, containerId) {
    try {
      // 使用docker exec连接到容器
      const terminal = pty.spawn('docker', [
        'exec',
        '-it',
        containerId,
        'su',
        '-',
        username
      ], {
        name: 'xterm-color',
        cols: 80,
        rows: 24,
        cwd: process.env.HOME,
        env: {
          ...process.env,
          TERM: 'xterm-256color'
        }
      });

      this.terminals.set(terminal.pid, terminal);

      // 发送欢迎消息
      setTimeout(() => {
        terminal.write('\r\n');
        terminal.write('🎉 欢迎来到LinuxDo自习室！\r\n');
        terminal.write('📁 你现在在一个独立的Ubuntu 22.04容器中\r\n');
        terminal.write('🔧 可以自由安装软件包和进行实验\r\n');
        terminal.write('⏰ 容器将在2小时后自动销毁\r\n');
        terminal.write('📖 输入 "cat welcome.txt" 查看更多信息\r\n');
        terminal.write('\r\n');
      }, 1000);

      return terminal;
    } catch (error) {
      console.error('创建终端失败:', error);
      throw new Error('终端创建失败');
    }
  }

  /**
   * 写入终端
   */
  writeToTerminal(terminalId, data) {
    const terminal = this.terminals.get(terminalId);
    if (terminal) {
      terminal.write(data);
    }
  }

  /**
   * 调整终端大小
   */
  resizeTerminal(terminalId, cols, rows) {
    const terminal = this.terminals.get(terminalId);
    if (terminal) {
      terminal.resize(cols, rows);
    }
  }

  /**
   * 关闭终端
   */
  closeTerminal(terminalId) {
    const terminal = this.terminals.get(terminalId);
    if (terminal) {
      terminal.kill();
      this.terminals.delete(terminalId);
    }
  }

  /**
   * 获取所有活跃终端
   */
  getActiveTerminals() {
    return Array.from(this.terminals.keys());
  }
}

module.exports = TerminalService;
