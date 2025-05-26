import React from 'react';
import { Terminal, LogOut, Github, Heart } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

const Header = ({ username, onLogout, onlineCount = 0 }) => {
  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4">
        <div className="flex items-center h-16">
          {/* 左侧：Logo和标题 */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-linuxdo-500 text-white rounded-lg">
              <Terminal size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                LinuxDo自习室
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
                一人一个容器的WebSSH系统
              </p>
            </div>
          </div>

          {/* 中间：通知栏 */}
          <div className="hidden lg:flex flex-1 justify-center mx-8">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2 max-w-md">
              <div className="flex items-center space-x-2">
                <span className="text-blue-600 dark:text-blue-400 text-sm">📢</span>
                <span className="text-blue-800 dark:text-blue-200 text-sm font-medium">
                  欢迎使用LinuxDo自习室！支持多用户在线协作学习
                </span>
              </div>
            </div>
          </div>

          {/* 右侧：用户信息和操作 */}
          <div className="flex items-center space-x-4">
            {username && (
              <>
                <div className="hidden sm:flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {username}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                    <span>在线:</span>
                    <span className="font-medium text-linuxdo-600 dark:text-linuxdo-400">
                      {onlineCount}
                    </span>
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <LogOut size={16} />
                  <span className="hidden sm:inline">退出</span>
                </button>
              </>
            )}

            {/* 主题切换按钮 */}
            <ThemeToggle />

            {/* GitHub链接 */}
            <a
              href="https://github.com/linuxdo-community"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Github size={16} />
              <span className="hidden sm:inline">GitHub</span>
            </a>
          </div>
        </div>
      </div>

      {/* 状态栏 */}
      {username && (
        <div className="bg-linuxdo-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-4 py-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                <span className="text-gray-600 dark:text-gray-400">
                  容器状态: <span className="text-green-600 dark:text-green-400 font-medium">运行中</span>
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  用户: <span className="font-medium">{username}</span>
                </span>
              </div>
              <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
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
