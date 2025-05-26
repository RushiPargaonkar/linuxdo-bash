import React, { useState, useEffect, useRef } from 'react';
import { Heart, User, Monitor, Eye } from 'lucide-react';
import { getUserAvatarColor, getUserInitial, getUserAvatar } from '../utils/avatarColors';

const OtherUsersTerminals = ({ socket, currentUsername, activeUsers }) => {
  const [userLikes, setUserLikes] = useState({});
  const [terminalOutputs, setTerminalOutputs] = useState({});
  const [userAvatars, setUserAvatars] = useState({});
  const terminalRefs = useRef({});

  // 过滤掉当前用户，只显示其他用户
  const otherUsers = activeUsers.filter(user => user !== currentUsername);

  // 调试信息
  console.log('OtherUsersTerminals - activeUsers:', activeUsers);
  console.log('OtherUsersTerminals - currentUsername:', currentUsername);
  console.log('OtherUsersTerminals - otherUsers:', otherUsers);

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
  }, [otherUsers]);

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

        // 延迟滚动，确保DOM已更新
        setTimeout(() => {
          scrollToBottom(username);
        }, 50);
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
    socket.on('user-liked', (data) => {
      // 点赞事件处理，不需要特殊逻辑
      console.log('用户点赞:', data);
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

  // 自动滚动到底部
  const scrollToBottom = (username) => {
    const terminalElement = terminalRefs.current[username];
    if (terminalElement) {
      terminalElement.scrollTop = terminalElement.scrollHeight;
    }
  };

  const handleLikeUser = (username) => {
    if (socket) {
      socket.emit('like-user', { targetUsername: username });
    }
  };

  const formatTerminalOutput = (output) => {
    if (!output) return '';

    // 清理终端控制序列，但保留更多有用信息
    let cleaned = output
      // 移除ANSI转义序列
      .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
      // 移除终端控制序列
      .replace(/\[\?[0-9]+[hl]/g, '')
      // 移除窗口标题设置
      .replace(/\x1b\]0;[^\x07]*\x07/g, '')
      // 简化长提示符，但保留路径信息
      .replace(/root@[a-f0-9]{12,}:([^\$#]*[\$#])/g, 'root@container:$1')
      // 移除连续的空行，但保留单个空行
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();

    // 显示更多行，让用户能看到完整的命令历史
    const lines = cleaned.split('\n');

    // 如果内容太多，显示最后30行，确保能看到足够的上下文
    if (lines.length > 30) {
      const lastLines = lines.slice(-30);
      return '...\n' + lastLines.join('\n');
    }

    return cleaned;
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
                ref={(el) => terminalRefs.current[username] = el}
                className="bg-black text-green-400 p-3 h-64 overflow-y-auto"
              >
                <div className="font-mono text-xs whitespace-pre-wrap">
                  {formatTerminalOutput(terminalOutputs[username]) || (
                    <div className="text-gray-500 italic">
                      等待用户操作...
                    </div>
                  )}
                </div>
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
