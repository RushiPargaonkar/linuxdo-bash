const { spawn } = require('child_process');
const Docker = require('dockerode');

class TerminalService {
  constructor(containerManager) {
    this.containerManager = containerManager;
    this.terminals = new Map(); // terminalId -> process instance
    this.docker = new Docker();
  }

  /**
   * 创建终端会话
   */
  async createTerminal(username, containerId) {
    try {
      console.log(`创建终端会话: ${username}, 容器: ${containerId}`);

      // 获取容器实例
      const container = this.docker.getContainer(containerId);

      // 创建exec实例
      const exec = await container.exec({
        Cmd: ['bash', '-l'],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: true,
        User: username,
        Env: ['TERM=xterm-256color'],
        WorkingDir: `/home/${username}`
      });

      // 启动exec
      const stream = await exec.start({
        hijack: true,
        stdin: true,
        Tty: true
      });

      // 创建一个伪终端对象
      const terminal = {
        pid: Date.now(), // 使用时间戳作为ID
        stream: stream,
        write: (data) => {
          if (stream && !stream.destroyed) {
            stream.write(data);
          }
        },
        onData: (callback) => {
          if (stream) {
            stream.on('data', callback);
          }
        },
        onExit: (callback) => {
          if (stream) {
            stream.on('end', callback);
            stream.on('close', callback);
          }
        },
        resize: (cols, rows) => {
          // Docker exec resize
          exec.resize({ h: rows, w: cols }).catch(err => {
            console.warn('Resize failed:', err.message);
          });
        },
        kill: () => {
          if (stream && !stream.destroyed) {
            stream.destroy();
          }
        }
      };

      this.terminals.set(terminal.pid, terminal);

      // 发送欢迎消息
      setTimeout(() => {
        terminal.write('\r\n🎉 欢迎来到LinuxDo自习室！\r\n');
        terminal.write('📁 你现在在一个独立的Ubuntu 22.04容器中\r\n');
        terminal.write('🔧 可以自由安装软件包和进行实验\r\n');
        terminal.write('⏰ 容器将在2小时后自动销毁\r\n');
        terminal.write('📖 输入 "cat welcome.txt" 查看更多信息\r\n');
        terminal.write(`${username}@linuxdo-container:~$ `);
      }, 1000);

      console.log(`终端会话创建成功: ${terminal.pid}`);
      return terminal;
    } catch (error) {
      console.error('创建终端失败:', error);
      throw new Error('终端创建失败: ' + error.message);
    }
  }

  /**
   * 写入终端
   */
  writeToTerminal(terminalId, data) {
    const terminal = this.terminals.get(terminalId);
    if (terminal) {
      console.log(`写入终端 ${terminalId}:`, data);
      terminal.write(data);
    } else {
      console.warn(`终端 ${terminalId} 不存在`);
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
   * 关闭终端
   */
  closeTerminal(terminalId) {
    const terminal = this.terminals.get(terminalId);
    if (terminal) {
      console.log(`关闭终端: ${terminalId}`);
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
