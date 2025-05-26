import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import LoginForm from './components/LoginForm';
import Terminal from './components/Terminal';
import Chat from './components/Chat';

import ProgressModal from './components/ProgressModal';
import Header from './components/Header';
import TestTerminal from './components/TestTerminal';
import OtherUsersTerminals from './components/OtherUsersTerminals';
import ThemeToggle from './components/ThemeToggle';
import { ThemeProvider } from './contexts/ThemeContext';
import { Terminal as TerminalIcon, MessageCircle } from 'lucide-react';

function App() {
  // 临时测试模式 - 设置为true来测试xterm
  const [testMode, setTestMode] = useState(false);

  const [socket, setSocket] = useState(null);
  const [username, setUsername] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isCreatingContainer, setIsCreatingContainer] = useState(false);
  const [progress, setProgress] = useState({ progress: 0, message: '' });
  const [activeUsers, setActiveUsers] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('terminal');

  useEffect(() => {
    // 检查URL参数，看是否是从LinuxDo登录回调回来的
    const urlParams = new URLSearchParams(window.location.search);
    const usernameFromUrl = urlParams.get('username');
    const loginSuccess = urlParams.get('login');

    if (usernameFromUrl && loginSuccess === 'success') {
      // 清除URL参数
      window.history.replaceState({}, document.title, window.location.pathname);
      // 自动登录
      setUsername(usernameFromUrl);
      handleAutoLogin(usernameFromUrl);
      return;
    }

    // 不再自动登录，只保留自动填充功能
    // 自动填充功能在LoginForm组件中处理

    // 初始化Socket连接
    // 根据环境自动选择后端地址
    const getBackendUrl = () => {
      if (window.location.hostname.includes('github.dev')) {
        // GitHub Codespaces环境
        return window.location.origin.replace('-5173', '-3001');
      }
      return 'http://localhost:3001';
    };

    const newSocket = io(getBackendUrl(), {
      autoConnect: false,
      timeout: 20000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      maxReconnectionAttempts: 5,
      forceNew: true
    });

    newSocket.on('connect', () => {
      console.log('Socket连接成功');

      // 设置心跳机制，每30秒发送一次ping
      const heartbeatInterval = setInterval(() => {
        if (newSocket.connected) {
          newSocket.emit('ping');
        } else {
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      // 存储心跳定时器，以便在断开连接时清理
      newSocket.heartbeatInterval = heartbeatInterval;
    });

    newSocket.on('disconnect', () => {
      console.log('Socket连接断开');
      setIsConnected(false);

      // 清理心跳定时器
      if (newSocket.heartbeatInterval) {
        clearInterval(newSocket.heartbeatInterval);
        newSocket.heartbeatInterval = null;
      }
    });

    newSocket.on('error', (data) => {
      console.log('Socket错误:', data);
      setError(data.message);
      setIsCreatingContainer(false);
    });

    newSocket.on('container-creating', (data) => {
      setIsCreatingContainer(true);
      setProgress({ progress: 0, message: data.message });
    });

    newSocket.on('container-progress', (data) => {
      setProgress(data);
    });

    newSocket.on('container-ready', (data) => {
      console.log('容器就绪:', data);
      setIsCreatingContainer(false);
      setIsConnected(true);
      setError('');

      // 容器就绪后多次请求用户列表，确保同步
      setTimeout(() => {
        newSocket.emit('get-user-list');
      }, 200);

      setTimeout(() => {
        newSocket.emit('get-user-list');
      }, 1000);

      setTimeout(() => {
        newSocket.emit('get-user-list');
      }, 2000);
    });

    newSocket.on('user-joined', (data) => {
      // 可以添加用户加入通知
      console.log('用户加入:', data.username);
    });

    newSocket.on('user-left', (data) => {
      // 可以添加用户离开通知
      console.log('用户离开:', data.username);
    });

    newSocket.on('user-list-updated', (userList) => {
      console.log('用户列表更新 (主监听器):', userList);
      setActiveUsers(userList);
    });

    // 聊天相关事件监听器移到setupSocketListeners中，避免重复
    // 设置Socket监听器
    setupSocketListeners(newSocket);

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const handleLogin = (inputUsername, inputPassword) => {
    if (!socket) return;

    setUsername(inputUsername);
    setError('');
    socket.connect();
    socket.emit('join', { username: inputUsername, password: inputPassword });

    // 获取聊天历史
    socket.emit('get-chat-history');

    // 获取用户列表
    socket.emit('get-user-list');
  };

  const handleAutoLogin = (inputUsername) => {
    // 为LinuxDo登录创建新的socket连接
    const getBackendUrl = () => {
      if (window.location.hostname.includes('github.dev')) {
        return window.location.origin.replace('-5173', '-3001');
      }
      return 'http://localhost:3001';
    };

    const newSocket = io(getBackendUrl(), {
      autoConnect: true
    });

    setSocket(newSocket);
    setUsername(inputUsername);
    setError('');

    newSocket.on('connect', () => {
      console.log('Socket连接成功');
      newSocket.emit('join', { username: inputUsername });
      newSocket.emit('get-chat-history');
      newSocket.emit('get-user-list');
    });

    // 设置其他socket事件监听器
    setupSocketListeners(newSocket);
  };

  const setupSocketListeners = (socketInstance) => {
    socketInstance.on('container-creating', () => {
      setIsCreatingContainer(true);
      setProgress({ progress: 0, message: '正在创建容器...' });
    });

    socketInstance.on('container-progress', (data) => {
      setProgress(data);
    });

    socketInstance.on('container-ready', (data) => {
      console.log('容器就绪 (setupSocketListeners):', data);
      setIsConnected(true);
      setIsCreatingContainer(false);
      setProgress({
        progress: 100,
        message: data.message || '容器就绪!'
      });
    });

    socketInstance.on('chat-message', (message) => {
      console.log('收到新聊天消息:', message);
      setChatMessages(prev => {
        const newMessages = [...prev, message];
        console.log('更新聊天消息列表:', newMessages);
        return newMessages;
      });
    });

    socketInstance.on('chat-history', (messages) => {
      console.log('收到聊天历史:', messages);
      setChatMessages(messages);
    });

    socketInstance.on('user-joined', (data) => {
      console.log('用户加入 (setupSocketListeners):', data.username);
      // 有新用户加入时，主动请求最新用户列表
      setTimeout(() => {
        socketInstance.emit('get-user-list');
      }, 500);
    });

    socketInstance.on('user-left', (data) => {
      console.log('用户离开 (setupSocketListeners):', data.username);
      // 有用户离开时，主动请求最新用户列表
      setTimeout(() => {
        socketInstance.emit('get-user-list');
      }, 500);
    });

    socketInstance.on('user-list-updated', (userList) => {
      console.log('用户列表更新 (setupSocketListeners):', userList);
      setActiveUsers(userList);
    });

    // 定期同步用户列表，确保数据准确
    const syncInterval = setInterval(() => {
      if (socketInstance.connected) {
        socketInstance.emit('get-user-list');
      }
    }, 10000); // 每10秒同步一次

    // 清理定时器
    return () => {
      clearInterval(syncInterval);
    };

    socketInstance.on('container-reset', (data) => {
      // 容器重置成功，显示消息
      setProgress({
        progress: 100,
        message: data.message
      });
      // 可以在这里添加更多重置后的处理逻辑
    });

    socketInstance.on('container-extended', (data) => {
      // 容器时间延长成功，显示消息
      alert(data.message);
    });

    socketInstance.on('error', (data) => {
      console.error('Socket错误:', data);
      setError(data.message);
      setIsCreatingContainer(false);

      // 如果是聊天相关错误，显示临时提示
      if (data.message.includes('发送消息') || data.message.includes('聊天')) {
        // 可以添加toast通知或其他UI反馈
        console.warn('聊天错误:', data.message);
      }
    });
  };

  const handleSendMessage = (message) => {
    if (!socket || !isConnected) {
      console.error('无法发送消息: socket未连接', { socket: !!socket, isConnected });
      return;
    }

    console.log('发送聊天消息:', { message, username, isConnected });
    socket.emit('chat-message', { message });
  };

  const handleLogout = () => {
    if (socket) {
      socket.disconnect();
    }
    setUsername('');
    setIsConnected(false);
    setIsCreatingContainer(false);
    setProgress({ progress: 0, message: '' });
    setChatMessages([]);
    setError('');
    // 注意：不清除localStorage，保留记住的账号信息
  };

  // 测试模式 - 只显示测试终端
  if (testMode) {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="p-4">
          <button
            onClick={() => setTestMode(false)}
            className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            退出测试模式
          </button>
          <TestTerminal />
        </div>
      </div>
    );
  }

  if (!isConnected && !isCreatingContainer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-linuxdo-50 to-linuxdo-100 dark:from-gray-900 dark:to-gray-800">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-linuxdo-500 text-white rounded-full mb-4">
                <TerminalIcon size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                欢迎来到LinuxDo自习室
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                输入用户名获得你的专属Linux容器
              </p>
            </div>

            <LoginForm onLogin={handleLogin} error={error} />

            <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
              <p>🐳 每个用户独立容器</p>
              <p>🛡️ 完全安全隔离</p>
              <p>⏰ 2小时自动清理</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isCreatingContainer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-linuxdo-50 to-linuxdo-100 dark:from-gray-900 dark:to-gray-800">
        <Header />
        <ProgressModal
          progress={progress.progress}
          message={progress.message}
          username={username}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header username={username} onLogout={handleLogout} onlineCount={activeUsers.length} />

      {/* 移动端标签切换 */}
      <div className="lg:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex">
          <button
            onClick={() => setActiveTab('terminal')}
            className={`flex-1 flex items-center justify-center py-3 px-4 text-sm font-medium ${
              activeTab === 'terminal'
                ? 'text-linuxdo-600 border-b-2 border-linuxdo-600'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <TerminalIcon size={18} className="mr-2" />
            终端
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 flex items-center justify-center py-3 px-4 text-sm font-medium ${
              activeTab === 'chat'
                ? 'text-linuxdo-600 border-b-2 border-linuxdo-600'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <MessageCircle size={18} className="mr-2" />
            聊天
          </button>

        </div>
      </div>

      <div className="container mx-auto px-4 py-6 relative">
        {/* 上半部分：终端区域 - 使用黄金比例 */}
        <div className="mb-8">
          {/* 终端区域 - 占据约62%宽度（黄金比例） */}
          <div className={`lg:w-[62%] ${activeTab !== 'terminal' ? 'hidden lg:block' : ''}`}>
            <Terminal socket={socket} username={username} />
          </div>
        </div>

        {/* 侧边栏 - 绝对定位，脱离文档流，使用黄金比例的剩余空间 */}
        <div className="lg:absolute lg:top-6 lg:right-4 lg:w-[36%] space-y-6 z-50">
          {/* 聊天室 */}
          <div className={`${activeTab !== 'chat' ? 'hidden lg:block' : ''}`}>
            <Chat
              socket={socket}
              messages={chatMessages}
              currentUsername={username}
              onSendMessage={handleSendMessage}
            />
          </div>
        </div>
      </div>

      {/* 下半部分：其他用户终端展示区域 - 使用黄金比例 */}
      <div className="container mx-auto px-4 pb-6">
        {/* 其他用户终端展示区域 - 使用和bash终端相同的62%宽度 */}
        <div className="lg:w-[62%]">
          {/* 调试信息 */}
          {console.log('App.jsx - activeUsers:', activeUsers)}
          {console.log('App.jsx - username:', username)}
          <OtherUsersTerminals
            socket={socket}
            currentUsername={username}
            activeUsers={activeUsers}
          />
        </div>
      </div>
    </div>
  );
}

// 包装App组件在ThemeProvider中
const AppWithTheme = () => {
  return (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
};

export default AppWithTheme;
