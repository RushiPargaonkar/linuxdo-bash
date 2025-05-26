import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Heart, User, Monitor, Eye } from 'lucide-react';
import { getUserAvatarColor, getUserInitial, getUserAvatar } from '../utils/avatarColors';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';

const OtherUsersTerminals = ({ socket, currentUsername, activeUsers }) => {
  const [userLikes, setUserLikes] = useState({});
  const [terminalOutputs, setTerminalOutputs] = useState({});
  const [userAvatars, setUserAvatars] = useState({});
  const terminalRefs = useRef({});
  const xtermInstances = useRef({});

  // 过滤掉当前用户，只显示其他用户
  const otherUsers = activeUsers.filter(user => user !== currentUsername);

  // 初始化xterm终端实例
  const initializeTerminal = useCallback((username, element) => {
    if (!element || xtermInstances.current[username]) return;

    const terminal = new Terminal({
      rows: 20,
      cols: 80,
      theme: {
        background: '#000000',
        foreground: '#ffffff',
        cursor: '#ffffff',
        selection: '#ffffff40'
      },
      fontSize: 12,
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
      cursorBlink: false,
      disableStdin: true // 只读模式
    });

    terminal.open(element);
    xtermInstances.current[username] = terminal;

    // 如果已有输出，写入终端
    if (terminalOutputs[username]) {
      terminal.write(terminalOutputs[username]);
    }
  }, [terminalOutputs]);

  // 自动滚动到底部
  const scrollToBottom = useCallback((username) => {
    const terminalElement = terminalRefs.current[username];
    if (terminalElement) {
      terminalElement.scrollTop = terminalElement.scrollHeight;
    }
  }, []);

  // 加载用户头像设置
  useEffect(() => {
    const loadUserAvatars = () => {
      const avatars = {};
      otherUsers.forEach(username => {
        const avatar = getUserAvatar(username);
        if (avatar) {
          avatars[username] = avatar;
        }
      });
      setUserAvatars(avatars);
    };

    loadUserAvatars();
  }, [otherUsers.length]); // 只依赖用户数量变化，避免无限循环

  // 使用ref来跟踪上一次的输出，只在真正有新内容时滚动
  const prevTerminalOutputs = useRef({});

  useEffect(() => {
    Object.keys(terminalOutputs).forEach(username => {
      // 只有当输出真正发生变化且用户在其他用户列表中时才滚动
      if (
        terminalOutputs[username] !== prevTerminalOutputs.current[username] &&
        otherUsers.includes(username)
      ) {
        setTimeout(() => scrollToBottom(username), 50);
      }
    });

    // 更新上一次的输出记录
    prevTerminalOutputs.current = { ...terminalOutputs };
  }, [terminalOutputs]); // 只依赖terminalOutputs

  useEffect(() => {
    if (!socket) return;

    // 监听其他用户的终端输出
    socket.on('user-terminal-output', (data) => {
      const { username, data: output } = data;
      if (username !== currentUsername) {
        setTerminalOutputs(prev => ({
          ...prev,
          [username]: (prev[username] || '') + output
        }));

        // 如果xterm实例存在，直接写入新数据
        const terminal = xtermInstances.current[username];
        if (terminal) {
          terminal.write(output);
        }
      }
    });

    // 监听点赞更新
    socket.on('likes-updated', (data) => {
      setUserLikes(prev => ({
        ...prev,
        [data.username]: data.likes
      }));
    });

    // 监听所有点赞数据
    socket.on('all-likes', (allLikes) => {
      setUserLikes(allLikes);
    });

    // 监听点赞事件（移除限制逻辑）
    socket.on('user-liked', () => {
      // 点赞事件处理，不需要特殊逻辑
    });

    // 获取初始点赞数据
    socket.emit('get-all-likes');

    return () => {
      socket.off('user-terminal-output');
      socket.off('likes-updated');
      socket.off('all-likes');
      socket.off('user-liked');
    };
  }, [socket, currentUsername]);

  // 清理xterm实例
  useEffect(() => {
    return () => {
      Object.values(xtermInstances.current).forEach(terminal => {
        if (terminal) {
          terminal.dispose();
        }
      });
      xtermInstances.current = {};
    };
  }, []);

  const handleLikeUser = (username) => {
    if (socket) {
      socket.emit('like-user', { targetUsername: username });
    }
  };



  if (otherUsers.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center">
        <Monitor className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-3" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">暂无其他用户</h3>
        <p className="text-gray-500 dark:text-gray-400">当有其他用户在线时，你可以在这里观看他们的终端操作</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
            <Eye className="h-5 w-5 mr-2 text-blue-500" />
            其他用户终端
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {otherUsers.length} 个用户在线
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {otherUsers.map((username) => (
            <div key={username} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              {/* 用户头部 */}
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm ${getUserAvatarColor(username, userAvatars[username])}`}>
                    {getUserInitial(username, userAvatars[username])}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">{username}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                      运行中
                    </div>
                  </div>
                </div>

                {/* 点赞按钮 */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {userLikes[username] || 0} ❤️
                  </span>
                  <button
                    onClick={() => handleLikeUser(username)}
                    className="p-2 rounded-full transition-colors bg-gray-100 dark:bg-gray-600 hover:bg-red-100 dark:hover:bg-red-900 text-gray-600 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400"
                    title="给TA点赞"
                  >
                    <Heart className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* 终端内容 */}
              <div
                ref={(el) => {
                  terminalRefs.current[username] = el;
                  if (el) {
                    initializeTerminal(username, el);
                  }
                }}
                className="bg-black h-64"
              >
                {!terminalOutputs[username] && (
                  <div className="flex items-center justify-center h-full text-gray-500 italic text-sm">
                    等待用户操作...
                  </div>
                )}
              </div>

              {/* 底部状态 */}
              <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 text-xs text-gray-500 dark:text-gray-400 flex justify-between">
                <span>只读模式</span>
                <span>实时同步</span>
              </div>
            </div>
          ))}
        </div>

        {/* 互动提示 */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-start space-x-2">
            <Heart className="h-4 w-4 text-blue-500 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="font-medium">互动功能</p>
              <p className="text-blue-600 dark:text-blue-400 mt-1">
                观看其他用户的实时操作，给优秀的操作点赞鼓励！可以无限制点赞支持。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OtherUsersTerminals;
