import React, { useState, useEffect } from 'react';
import { Heart, User, Monitor, Eye } from 'lucide-react';

const OtherUsersTerminals = ({ socket, currentUsername, activeUsers }) => {
  const [userLikes, setUserLikes] = useState({});
  const [terminalOutputs, setTerminalOutputs] = useState({});

  // 过滤掉当前用户，只显示其他用户
  const otherUsers = activeUsers.filter(user => user !== currentUsername);

  // 调试信息
  console.log('OtherUsersTerminals - activeUsers:', activeUsers);
  console.log('OtherUsersTerminals - currentUsername:', currentUsername);
  console.log('OtherUsersTerminals - otherUsers:', otherUsers);

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

  const handleLikeUser = (username) => {
    if (socket) {
      socket.emit('like-user', { targetUsername: username });
    }
  };

  const formatTerminalOutput = (output) => {
    if (!output) return '';

    // 清理终端控制序列和冗余提示符
    let cleaned = output
      // 移除ANSI转义序列
      .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
      // 移除终端控制序列
      .replace(/\[\?[0-9]+[hl]/g, '')
      // 移除窗口标题设置
      .replace(/\x1b\]0;[^\x07]*\x07/g, '')
      // 移除重复的提示符
      .replace(/root@[a-f0-9]+:[^\$#]*[\$#]\s*root@[a-f0-9]+:[^\$#]*[\$#]/g, 'root@container:~# ')
      // 简化长提示符
      .replace(/root@[a-f0-9]{12,}:[^\$#]*[\$#]/g, 'root@container:~# ')
      // 移除多余的空行
      .replace(/\n\s*\n/g, '\n')
      .trim();

    // 只显示最后几行，避免内容过长
    const lines = cleaned.split('\n');
    const lastLines = lines.slice(-8); // 显示最后8行
    return lastLines.join('\n');
  };

  if (otherUsers.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
        <Monitor className="mx-auto h-12 w-12 text-gray-400 mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">暂无其他用户</h3>
        <p className="text-gray-500">当有其他用户在线时，你可以在这里观看他们的终端操作</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Eye className="h-5 w-5 mr-2 text-blue-500" />
            其他用户终端
          </h3>
          <span className="text-sm text-gray-500">
            {otherUsers.length} 个用户在线
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {otherUsers.map((username) => (
            <div key={username} className="border rounded-lg overflow-hidden">
              {/* 用户头部 */}
              <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{username}</div>
                    <div className="text-xs text-gray-500 flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                      运行中
                    </div>
                  </div>
                </div>

                {/* 点赞按钮 */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    {userLikes[username] || 0} ❤️
                  </span>
                  <button
                    onClick={() => handleLikeUser(username)}
                    className="p-2 rounded-full transition-colors bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-500"
                    title="给TA点赞"
                  >
                    <Heart className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* 终端内容 */}
              <div className="bg-black text-green-400 p-3 h-32 overflow-hidden">
                <div className="font-mono text-xs whitespace-pre-wrap">
                  {formatTerminalOutput(terminalOutputs[username]) || (
                    <div className="text-gray-500 italic">
                      等待用户操作...
                    </div>
                  )}
                </div>
              </div>

              {/* 底部状态 */}
              <div className="bg-gray-50 px-3 py-2 text-xs text-gray-500 flex justify-between">
                <span>只读模式</span>
                <span>实时同步</span>
              </div>
            </div>
          ))}
        </div>

        {/* 互动提示 */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-start space-x-2">
            <Heart className="h-4 w-4 text-blue-500 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium">互动功能</p>
              <p className="text-blue-600 mt-1">
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
