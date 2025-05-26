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

    // 创建终端实例
    const xterm = new XTerm({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 14,
      fontFamily: 'JetBrains Mono, Fira Code, Monaco, Consolas, monospace',
      theme: {
        background: '#1a1a1a',
        foreground: '#ffffff',
        cursor: '#ffffff',
        selection: '#3e3e3e',
        black: '#000000',
        red: '#ff5555',
        green: '#50fa7b',
        yellow: '#f1fa8c',
        blue: '#bd93f9',
        magenta: '#ff79c6',
        cyan: '#8be9fd',
        white: '#bfbfbf',
        brightBlack: '#4d4d4d',
        brightRed: '#ff6e67',
        brightGreen: '#5af78e',
        brightYellow: '#f4f99d',
        brightBlue: '#caa9fa',
        brightMagenta: '#ff92d0',
        brightCyan: '#9aedfe',
        brightWhite: '#e6e6e6'
      },
      allowTransparency: false,
      convertEol: true,
      scrollback: 1000,
      tabStopWidth: 4
    });

    // 添加插件
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    xterm.loadAddon(fitAddon);
    xterm.loadAddon(webLinksAddon);

    // 打开终端
    xterm.open(terminalRef.current);
    fitAddon.fit();

    // 保存引用
    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    // 监听终端输入
    xterm.onData((data) => {
      socket.emit('terminal-input', data);
    });

    // 监听终端输出
    socket.on('terminal-output', (data) => {
      xterm.write(data);
    });

    // 监听终端退出
    socket.on('terminal-exit', () => {
      xterm.write('\r\n\r\n[终端会话已结束]\r\n');
    });

    // 监听窗口大小变化
    const handleResize = () => {
      if (fitAddon) {
        fitAddon.fit();
        socket.emit('terminal-resize', {
          cols: xterm.cols,
          rows: xterm.rows
        });
      }
    };

    window.addEventListener('resize', handleResize);

    // 初始化大小
    setTimeout(() => {
      handleResize();
    }, 100);

    return () => {
      window.removeEventListener('resize', handleResize);
      socket.off('terminal-output');
      socket.off('terminal-exit');
      if (xterm) {
        xterm.dispose();
      }
    };
  }, [socket]);

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    setTimeout(() => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
        socket.emit('terminal-resize', {
          cols: xtermRef.current.cols,
          rows: xtermRef.current.rows
        });
      }
    }, 100);
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
        ref={terminalRef}
        className={`bg-black ${
          isFullscreen
            ? 'h-[calc(100vh-48px)]'
            : 'h-96 lg:h-[500px]'
        }`}
        style={{ minHeight: '300px' }}
      />

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
