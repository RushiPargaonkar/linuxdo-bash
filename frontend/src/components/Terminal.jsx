import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Maximize2, Minimize2, RotateCcw } from 'lucide-react';

const Terminal = ({ socket, username }) => {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!socket || !terminalRef.current) return;

    // 创建终端实例 - 使用最简单的配置
    const xterm = new XTerm({
      fontSize: 14,
      fontFamily: 'monospace',
      cursorBlink: true,
      theme: {
        background: '#000000',
        foreground: '#ffffff'
      }
    });

    // 添加插件
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    xterm.loadAddon(fitAddon);
    xterm.loadAddon(webLinksAddon);

    // 打开终端
    try {
      xterm.open(terminalRef.current);
      console.log('Terminal opened successfully');

      // 立即写入连接状态
      xterm.write('\x1b[36m正在连接到容器...\x1b[0m\r\n');
      xterm.write('\x1b[33m请稍候，正在准备您的Linux环境\x1b[0m\r\n');
      xterm.write('\r\n');

      // 延迟调用fit
      setTimeout(() => {
        try {
          fitAddon.fit();
          console.log('Terminal fitted, size:', xterm.cols, 'x', xterm.rows);
        } catch (error) {
          console.warn('Initial fit failed:', error);
        }
      }, 200);
    } catch (error) {
      console.error('Terminal open failed:', error);
      return;
    }

    // 保存引用
    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    // 监听终端输入
    xterm.onData((data) => {
      socket.emit('terminal-input', data);
    });

    // 监听终端输出
    socket.on('terminal-output', (data) => {
      console.log('收到终端输出:', data);

      try {
        // 第一次收到数据时清除初始文本
        if (!xterm.hasReceivedData) {
          xterm.clear();
          xterm.hasReceivedData = true;
        }

        // 直接写入数据
        xterm.write(data);
      } catch (error) {
        console.error('写入终端失败:', error);
      }
    });

    // 监听终端退出
    socket.on('terminal-exit', () => {
      xterm.write('\r\n\r\n[终端会话已结束]\r\n');
    });

    // 监听窗口大小变化
    const handleResize = () => {
      if (fitAddon && xterm) {
        try {
          fitAddon.fit();
          socket.emit('terminal-resize', {
            cols: xterm.cols,
            rows: xterm.rows
          });
        } catch (error) {
          console.warn('Terminal resize failed:', error);
        }
      }
    };

    window.addEventListener('resize', handleResize);

    // 初始化大小 - 延迟更长时间确保DOM完全渲染
    const resizeTimer = setTimeout(() => {
      handleResize();
    }, 300);

    // 再次确保大小正确
    const secondResizeTimer = setTimeout(() => {
      handleResize();
    }, 1000);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
      clearTimeout(secondResizeTimer);
      socket.off('terminal-output');
      socket.off('terminal-exit');
      if (xterm) {
        xterm.dispose();
      }
    };
  }, [socket]);

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    // 延迟调整大小，确保CSS动画完成
    setTimeout(() => {
      if (fitAddonRef.current && xtermRef.current) {
        try {
          fitAddonRef.current.fit();
          socket.emit('terminal-resize', {
            cols: xtermRef.current.cols,
            rows: xtermRef.current.rows
          });
        } catch (error) {
          console.warn('Fullscreen resize failed:', error);
        }
      }
    }, 200);
  };

  const handleClear = () => {
    if (xtermRef.current) {
      xtermRef.current.clear();
    }
  };

  const handleReset = () => {
    if (xtermRef.current) {
      xtermRef.current.reset();
    }
  };

  return (
    <div className={`terminal-container ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* 终端头部 */}
      <div className="terminal-header">
        <div className="flex items-center space-x-2">
          <div className="terminal-controls">
            <div className="terminal-control close"></div>
            <div className="terminal-control minimize"></div>
            <div className="terminal-control maximize"></div>
          </div>
          <span className="text-gray-300 text-sm font-medium ml-4">
            {username}@linuxdo-container
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleClear}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            title="清屏"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={handleFullscreen}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            title={isFullscreen ? "退出全屏" : "全屏"}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* 终端内容 */}
      <div
        className={`overflow-hidden ${
          isFullscreen
            ? 'h-[calc(100vh-96px)]'
            : 'h-96 lg:h-[500px]'
        }`}
        style={{
          minHeight: '300px',
          width: '100%',
          position: 'relative',
          backgroundColor: '#000000',
          color: '#ffffff'
        }}
      >
        {/* 使用iframe嵌入webssh - 这个方案已经验证可以工作 */}
        <iframe
          src={`http://localhost:3002/ssh?username=${username}`}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            backgroundColor: '#000000'
          }}
          title="WebSSH Terminal"
        />
      </div>

      {/* 状态栏 */}
      <div className="bg-gray-800 px-4 py-2 text-xs text-gray-400 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <span>容器: {username}</span>
          <span className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
            已连接
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <span>UTF-8</span>
          <span>Bash</span>
        </div>
      </div>
    </div>
  );
};

export default Terminal;
