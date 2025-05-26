import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import LoginForm from './components/LoginForm';
import Terminal from './components/Terminal';
import Chat from './components/Chat';
import UserList from './components/UserList';
import ProgressModal from './components/ProgressModal';
import Header from './components/Header';
import { Terminal as TerminalIcon, MessageCircle, Users } from 'lucide-react';

function App() {
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

  const handleLogin = (inputUsername) => {
    if (!socket) return;
    
    setUsername(inputUsername);
    setError('');
    socket.connect();
    socket.emit('join', { username: inputUsername });
    
    // 获取聊天历史
    socket.emit('get-chat-history');
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
    setProgress({ progress: 0, message: '' });
    setChatMessages([]);
    setError('');
  };

  if (!isConnected && !isCreatingContainer) {
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
              <UserList users={activeUsers} currentUsername={username} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
