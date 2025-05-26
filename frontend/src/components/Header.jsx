import React from 'react';
import { Terminal, LogOut, Github, Heart, UserX } from 'lucide-react';

const Header = ({ username, onLogout }) => {
  const handleForgetAccount = () => {
    if (confirm('确定要清除保存的账号信息吗？下次需要重新输入用户名和密码。')) {
      localStorage.removeItem('linuxdo-credentials');
      alert('账号信息已清除');
    }
  };
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo和标题 */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-linuxdo-500 text-white rounded-lg">
              <Terminal size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                LinuxDo自习室
              </h1>
              <p className="text-sm text-gray-500 hidden sm:block">
                一人一个容器的WebSSH系统
              </p>
            </div>
          </div>

          {/* 用户信息和操作 */}
          <div className="flex items-center space-x-4">
            {username && (
              <>
                <div className="hidden sm:flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">
                    {username}
                  </span>
                </div>
                <button
                  onClick={handleForgetAccount}
                  className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="清除保存的账号信息"
                >
                  <UserX size={16} />
                  <span className="hidden sm:inline">忘记账号</span>
                </button>
                <button
                  onClick={onLogout}
                  className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <LogOut size={16} />
                  <span className="hidden sm:inline">退出</span>
                </button>
              </>
            )}

            {/* GitHub链接 */}
            <a
              href="https://github.com/linuxdo-community"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Github size={16} />
              <span className="hidden sm:inline">GitHub</span>
            </a>
          </div>
        </div>
      </div>

      {/* 状态栏 */}
      {username && (
        <div className="bg-linuxdo-50 border-t">
          <div className="container mx-auto px-4 py-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                <span className="text-gray-600">
                  容器状态: <span className="text-green-600 font-medium">运行中</span>
                </span>
                <span className="text-gray-600">
                  用户: <span className="font-medium">{username}</span>
                </span>
              </div>
              <div className="flex items-center space-x-2 text-gray-500">
                <Heart size={14} />
                <span>Made with ❤️ by LinuxDo Community</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
