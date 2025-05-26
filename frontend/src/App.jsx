import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import LoginForm from './components/LoginForm';
import Terminal from './components/Terminal';
import Chat from './components/Chat';
import UserList from './components/UserList';
import ProgressModal from './components/ProgressModal';
import Header from './components/Header';
import TestTerminal from './components/TestTerminal';
import { Terminal as TerminalIcon, MessageCircle, Users } from 'lucide-react';

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
  const [isAutoLogging, setIsAutoLogging] = useState(false);

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

    // 检查是否有保存的登录信息
    const savedCredentials = localStorage.getItem('linuxdo-credentials');
    if (savedCredentials) {
      try {
        const { username: savedUsername, password: savedPassword, rememberMe } = JSON.parse(savedCredentials);
        if (rememberMe && savedUsername && savedPassword) {
          setIsAutoLogging(true);
          setUsername(savedUsername);
          // 延迟一下再自动登录，让用户看到正在自动登录的提示
          setTimeout(() => {
            handleLogin(savedUsername, savedPassword);
          }, 1000);
          return;
        }
      } catch (error) {
        console.error('读取保存的登录信息失败:', error);
        localStorage.removeItem('linuxdo-credentials');
      }
    }

    // 初始化Socket连接
    const newSocket = io(window.location.origin, {
      autoConnect: false
    });

    newSocket.on('connect', () => {
      console.log('Socket连接成功');
    });

    newSocket.on('disconnect', () => {
      console.log('Socket连接断开');
      setIsConnected(false);
    });

    newSocket.on('error', (data) => {
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
      setIsCreatingContainer(false);
      setIsConnected(true);
      setError('');
    });

    newSocket.on('user-joined', (data) => {
      // 可以添加用户加入通知
    });

    newSocket.on('user-left', (data) => {
      // 可以添加用户离开通知
    });

    newSocket.on('chat-message', (message) => {
      setChatMessages(prev => [...prev, message]);
    });

    newSocket.on('chat-history', (messages) => {
      setChatMessages(messages);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const handleLogin = (inputUsername, inputPassword) => {
    if (!socket) return;

    setUsername(inputUsername);
    setError('');
    setIsAutoLogging(false); // 清除自动登录状态
    socket.connect();
    socket.emit('join', { username: inputUsername, password: inputPassword });

    // 获取聊天历史
    socket.emit('get-chat-history');
  };

  const handleAutoLogin = (inputUsername) => {
    // 为LinuxDo登录创建新的socket连接
    const newSocket = io(window.location.origin, {
      autoConnect: true
    });

    setSocket(newSocket);
    setUsername(inputUsername);
    setError('');

    newSocket.on('connect', () => {
      console.log('Socket连接成功');
      newSocket.emit('join', { username: inputUsername });
      newSocket.emit('get-chat-history');
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
      setIsConnected(true);
      setIsCreatingContainer(false);
      setProgress({
        progress: 100,
        message: data.message || '容器就绪!'
      });
    });

    socketInstance.on('chat-message', (message) => {
      setChatMessages(prev => [...prev, message]);
    });

    socketInstance.on('chat-history', (messages) => {
      setChatMessages(messages);
    });

    socketInstance.on('user-joined', (data) => {
      setActiveUsers(prev => [...prev.filter(u => u !== data.username), data.username]);
    });

    socketInstance.on('user-left', (data) => {
      setActiveUsers(prev => prev.filter(u => u !== data.username));
    });

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
      setError(data.message);
      setIsCreatingContainer(false);
    });
  };

  const handleSendMessage = (message) => {
    if (!socket || !isConnected) return;
    socket.emit('chat-message', { message });
  };

  const handleLogout = () => {
    if (socket) {
      socket.disconnect();
    }
    setUsername('');
    setIsConnected(false);
    setIsCreatingContainer(false);
    setIsAutoLogging(false);
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
    // 自动登录状态
    if (isAutoLogging) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-linuxdo-50 to-linuxdo-100">
          <Header />
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-md mx-auto">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-linuxdo-500 text-white rounded-full mb-4">
                  <TerminalIcon size={32} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  自动登录中...
                </h2>
                <p className="text-gray-600 mb-6">
                  正在使用保存的账号信息登录
                </p>
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-linuxdo-500"></div>
                  <span className="text-sm text-gray-500">用户: {username}</span>
                </div>
                <button
                  onClick={() => {
                    setIsAutoLogging(false);
                    localStorage.removeItem('linuxdo-credentials');
                  }}
                  className="mt-4 text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  取消自动登录
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-linuxdo-50 to-linuxdo-100">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-linuxdo-500 text-white rounded-full mb-4">
                <TerminalIcon size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                欢迎来到LinuxDo自习室
              </h2>
              <p className="text-gray-600">
                输入用户名获得你的专属Linux容器
              </p>
            </div>

            <LoginForm onLogin={handleLogin} error={error} />

            <div className="mt-8 text-center text-sm text-gray-500">
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
      <div className="min-h-screen bg-gradient-to-br from-linuxdo-50 to-linuxdo-100">
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
    <div className="min-h-screen bg-gray-50">
      <Header username={username} onLogout={handleLogout} />

      {/* 移动端标签切换 */}
      <div className="lg:hidden bg-white border-b">
        <div className="flex">
          <button
            onClick={() => setActiveTab('terminal')}
            className={`flex-1 flex items-center justify-center py-3 px-4 text-sm font-medium ${
              activeTab === 'terminal'
                ? 'text-linuxdo-600 border-b-2 border-linuxdo-600'
                : 'text-gray-500'
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
                : 'text-gray-500'
            }`}
          >
            <MessageCircle size={18} className="mr-2" />
            聊天
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 flex items-center justify-center py-3 px-4 text-sm font-medium ${
              activeTab === 'users'
                ? 'text-linuxdo-600 border-b-2 border-linuxdo-600'
                : 'text-gray-500'
            }`}
          >
            <Users size={18} className="mr-2" />
            用户
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 终端区域 */}
          <div className={`lg:col-span-3 ${activeTab !== 'terminal' ? 'hidden lg:block' : ''}`}>
            <Terminal socket={socket} username={username} />
          </div>

          {/* 侧边栏 */}
          <div className="lg:col-span-1 space-y-6">
            {/* 聊天室 */}
            <div className={`${activeTab !== 'chat' ? 'hidden lg:block' : ''}`}>
              <Chat
                socket={socket}
                messages={chatMessages}
                currentUsername={username}
                onSendMessage={handleSendMessage}
              />
            </div>

            {/* 用户列表 */}
            <div className={`${activeTab !== 'users' ? 'hidden lg:block' : ''}`}>
              <UserList users={activeUsers} currentUsername={username} socket={socket} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
