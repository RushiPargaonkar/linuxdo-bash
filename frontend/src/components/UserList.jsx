import React, { useState, useEffect } from 'react';
import { Users, Clock, Container, Eye, RotateCcw, Plus } from 'lucide-react';

const UserList = ({ users, currentUsername, socket }) => {
  const [userTerminalOutputs, setUserTerminalOutputs] = useState({});
  const [isResetting, setIsResetting] = useState(false);
  const [isExtending, setIsExtending] = useState(false);

  const formatUptime = (uptime) => {
    const minutes = Math.floor(uptime / (1000 * 60));
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const formatTimeRemaining = (createdAt) => {
    const now = Date.now();
    const elapsed = now - createdAt;
    const remaining = (2 * 60 * 60 * 1000) - elapsed; // 2小时 - 已用时间

    if (remaining <= 0) {
      return '即将过期';
    }

    const minutes = Math.floor(remaining / (1000 * 60));
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m 后过期`;
    } else {
      return `${minutes}m 后过期`;
    }
  };

  // 重置容器
  const handleResetContainer = async () => {
    if (!socket || isResetting) return;

    if (confirm('确定要重置容器吗？这将删除容器内的所有数据并重新创建。')) {
      setIsResetting(true);
      try {
        socket.emit('reset-container', { username: currentUsername });
      } catch (error) {
        console.error('重置容器失败:', error);
      } finally {
        setTimeout(() => setIsResetting(false), 3000);
      }
    }
  };

  // 延长容器时间
  const handleExtendContainer = async () => {
    if (!socket || isExtending) return;

    setIsExtending(true);
    try {
      socket.emit('extend-container', { username: currentUsername });
    } catch (error) {
      console.error('延长容器时间失败:', error);
    } finally {
      setTimeout(() => setIsExtending(false), 2000);
    }
  };

  // 模拟用户列表数据（实际应该从props或API获取）
  const mockUsers = [
    {
      username: currentUsername,
      containerId: 'container-123',
      createdAt: Date.now() - 30 * 60 * 1000, // 30分钟前
      uptime: 30 * 60 * 1000
    }
  ];

  // 转换用户数据格式
  const displayUsers = users.length > 0 ?
    users.map(username => {
      // 如果是字符串，转换为对象格式
      if (typeof username === 'string') {
        return {
          username,
          containerId: 'container-' + username.substring(0, 8),
          createdAt: Date.now() - 30 * 60 * 1000, // 默认30分钟前
          uptime: 30 * 60 * 1000
        };
      }
      // 如果已经是对象，直接返回
      return username;
    }) :
    (currentUsername ? mockUsers : []);

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* 用户列表头部 */}
      <div className="bg-gray-800 text-white px-4 py-3">
        <div className="flex items-center space-x-2">
          <Users size={20} />
          <span className="font-semibold">在线用户</span>
          <span className="bg-gray-600 text-xs px-2 py-1 rounded-full">
            {displayUsers.length}
          </span>
        </div>
      </div>

      {/* 用户列表 */}
      <div className="divide-y divide-gray-200">
        {displayUsers.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Users size={32} className="mx-auto mb-2 opacity-50" />
            <p>暂无在线用户</p>
          </div>
        ) : (
          displayUsers.filter(user => user && user.username).map((user) => {

            const isCurrentUser = user.username === currentUsername;

            return (
              <div key={user.username} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    {/* 用户头像 */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                      isCurrentUser ? 'bg-linuxdo-500' : 'bg-gray-500'
                    }`}>
                      {user.username && user.username.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">
                          {user.username}
                        </span>
                        {isCurrentUser && (
                          <span className="text-xs bg-linuxdo-100 text-linuxdo-800 px-2 py-1 rounded-full">
                            你
                          </span>
                        )}
                      </div>

                      {/* 容器信息 */}
                      <div className="flex items-center space-x-1 mt-1 text-xs text-gray-500">
                        <Container size={12} />
                        <span>{user.containerId?.substring(0, 12) || 'container-xxx'}</span>
                      </div>

                      {/* 运行时间 */}
                      <div className="flex items-center space-x-1 mt-1 text-xs text-gray-500">
                        <Clock size={12} />
                        <span>运行 {formatUptime(user.uptime)}</span>
                      </div>

                      {/* 剩余时间 */}
                      <div className="text-xs text-orange-600 mt-1">
                        {formatTimeRemaining(user.createdAt)}
                      </div>
                    </div>
                  </div>

                  {/* 状态指示器和操作按钮 */}
                  <div className="flex flex-col items-end space-y-2">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-green-600">运行中</span>
                    </div>

                    {isCurrentUser ? (
                      /* 当前用户的操作按钮 */
                      <div className="flex flex-col space-y-1">
                        <button
                          onClick={handleResetContainer}
                          disabled={isResetting}
                          className="flex items-center space-x-1 text-xs text-red-600 hover:text-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <RotateCcw size={12} className={isResetting ? 'animate-spin' : ''} />
                          <span>{isResetting ? '重置中...' : '重置容器'}</span>
                        </button>

                        <button
                          onClick={handleExtendContainer}
                          disabled={isExtending}
                          className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus size={12} />
                          <span>{isExtending ? '延长中...' : '延长时间'}</span>
                        </button>
                      </div>
                    ) : (
                      <button className="flex items-center space-x-1 text-xs text-gray-500 hover:text-gray-700 transition-colors">
                        <Eye size={12} />
                        <span>观看</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 最近终端输出预览 */}
                {userTerminalOutputs[user.username] && (
                  <div className="mt-3 p-2 bg-gray-900 text-green-400 text-xs font-mono rounded overflow-hidden">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-500">最近输出:</span>
                      <Eye size={10} className="text-gray-500" />
                    </div>
                    <div className="truncate">
                      {userTerminalOutputs[user.username]}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 统计信息 */}
      <div className="bg-gray-50 px-4 py-3 text-xs text-gray-600">
        <div className="flex justify-between items-center">
          <span>总计 {displayUsers.length} 个活跃容器</span>
          <span>自动清理: 2小时</span>
        </div>
      </div>
    </div>
  );
};

export default UserList;
