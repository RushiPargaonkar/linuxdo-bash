import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';

const TestTerminal = () => {
  const terminalRef = useRef(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    console.log('Creating test terminal...');

    const terminal = new Terminal({
      fontSize: 16,
      fontFamily: 'monospace',
      theme: {
        background: '#000000',
        foreground: '#ffffff'
      },
      cursorBlink: true
    });

    let currentLine = '';

    try {
      terminal.open(terminalRef.current);
      console.log('Test terminal opened');

      // 写入测试文本
      terminal.write('=== XTerm.js Test ===\r\n');
      terminal.write('If you can see this text, XTerm.js is working!\r\n');
      terminal.write('Terminal size: ' + terminal.cols + 'x' + terminal.rows + '\r\n');
      terminal.write('Type something and press Enter:\r\n');
      terminal.write('$ ');

      // 处理用户输入
      terminal.onData((data) => {
        const code = data.charCodeAt(0);

        if (code === 13) { // Enter键
          terminal.write('\r\n');
          if (currentLine.trim()) {
            terminal.write('You typed: ' + currentLine + '\r\n');
          }
          currentLine = '';
          terminal.write('$ ');
        } else if (code === 127) { // Backspace键
          if (currentLine.length > 0) {
            currentLine = currentLine.slice(0, -1);
            terminal.write('\b \b');
          }
        } else if (code >= 32) { // 可打印字符
          currentLine += data;
          terminal.write(data);
        }
      });

      console.log('Test text written to terminal');
    } catch (error) {
      console.error('Failed to create test terminal:', error);
    }

    return () => {
      terminal.dispose();
    };
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4 text-white">XTerm.js 测试</h2>
      <div
        ref={terminalRef}
        style={{
          width: '800px',
          height: '400px',
          backgroundColor: '#000000',
          border: '1px solid #666'
        }}
      />
    </div>
  );
};

export default TestTerminal;
