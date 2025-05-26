import React, { useState, useEffect } from 'react';
import { User, ArrowRight, AlertCircle, ExternalLink, Lock } from 'lucide-react';

const LoginForm = ({ onLogin, error }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const validateUsername = (name) => {
    // Linux用户名规则验证
    const regex = /^[a-z][a-z0-9_-]{0,31}$/;
    return regex.test(name) && !name.endsWith('-');
  };

  const validatePassword = (pass) => {
    // 密码规则：至少6位，包含字母和数字
    return pass.length >= 6 && /[a-zA-Z]/.test(pass) && /[0-9]/.test(pass);
  };

  // 组件加载时读取保存的账号信息
  useEffect(() => {
    const savedCredentials = localStorage.getItem('linuxdo-credentials');
    if (savedCredentials) {
      try {
        const { username: savedUsername, password: savedPassword, rememberMe: savedRememberMe } = JSON.parse(savedCredentials);
        if (savedRememberMe) {
          setUsername(savedUsername || '');
          setPassword(savedPassword || '');
          setRememberMe(true);
        }
      } catch (error) {
        console.error('读取保存的账号信息失败:', error);
        localStorage.removeItem('linuxdo-credentials');
      }
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      return;
    }

    if (!validateUsername(username)) {
      return;
    }

    if (!validatePassword(password)) {
      return;
    }

    setIsLoading(true);
    try {
      // 保存账号信息（如果选择了记住我）
      if (rememberMe) {
        const credentials = {
          username,
          password,
          rememberMe: true
        };
        localStorage.setItem('linuxdo-credentials', JSON.stringify(credentials));
      } else {
        // 如果没有选择记住我，清除保存的信息
        localStorage.removeItem('linuxdo-credentials');
      }

      await onLogin(username, password);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinuxDoLogin = () => {
    window.location.href = 'http://localhost:3001/auth/linuxdo';
  };

  const isValid = username && password && validateUsername(username) && validatePassword(password);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* LinuxDo登录选项 (暂时注释掉) */}
      {/* <div className="mb-6">
        <button
          onClick={handleLinuxDoLogin}
          className="w-full flex items-center justify-center px-4 py-3 border border-linuxdo-300 rounded-lg text-sm font-medium text-linuxdo-700 bg-linuxdo-50 hover:bg-linuxdo-100 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          使用 LinuxDo 账号登录
          <ExternalLink size={16} className="ml-2" />
        </button>

        <div className="mt-4 flex items-center">
          <div className="flex-1 border-t border-gray-300"></div>
          <div className="px-3 text-sm text-gray-500">或</div>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>
      </div> */}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
            用户名
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="输入你的用户名"
              className={`block w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-linuxdo-500 focus:border-transparent ${
                username && !isValid
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-300'
              }`}
              disabled={isLoading}
              autoComplete="username"
              autoFocus
            />
          </div>

          {/* 用户名规则提示 */}
          <div className="mt-2 text-xs text-gray-500">
            <p>用户名规则：</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>只能包含小写字母、数字、下划线、连字符</li>
              <li>必须以字母开头，长度1-32字符</li>
              <li>不能以连字符结尾</li>
            </ul>
          </div>

          {/* 验证错误提示 */}
          {username && !validateUsername(username) && (
            <div className="mt-2 flex items-center text-sm text-red-600">
              <AlertCircle size={16} className="mr-1" />
              用户名格式不正确
            </div>
          )}
        </div>

        {/* 密码输入框 */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            密码
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="设置你的密码"
              className={`block w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-linuxdo-500 focus:border-transparent ${
                password && !validatePassword(password)
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-300'
              }`}
              disabled={isLoading}
              autoComplete="new-password"
            />
          </div>

          {/* 密码规则提示 */}
          <div className="mt-2 text-xs text-gray-500">
            <p>密码规则：</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>至少6位字符</li>
              <li>必须包含字母和数字</li>
            </ul>
          </div>

          {/* 密码验证错误提示 */}
          {password && !validatePassword(password) && (
            <div className="mt-2 flex items-center text-sm text-red-600">
              <AlertCircle size={16} className="mr-1" />
              密码格式不正确
            </div>
          )}
        </div>

        {/* 记住我选项 */}
        <div className="flex items-center">
          <input
            id="remember-me"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 text-linuxdo-600 focus:ring-linuxdo-500 border-gray-300 rounded"
          />
          <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
            记住账号密码
          </label>
        </div>

        {/* 服务器错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center text-sm text-red-600">
              <AlertCircle size={16} className="mr-2" />
              {error}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={!isValid || isLoading}
          className={`w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white transition-colors ${
            isValid && !isLoading
              ? 'bg-linuxdo-600 hover:bg-linuxdo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-linuxdo-500'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <>
              <div className="loading-spinner mr-2"></div>
              连接中...
            </>
          ) : (
            <>
              创建我的容器
              <ArrowRight size={16} className="ml-2" />
            </>
          )}
        </button>
      </form>

      {/* 示例用户名 */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600 mb-2">示例用户名：</p>
        <div className="flex flex-wrap gap-2">
          {['alice', 'bob123', 'dev_user', 'test-user'].map((example) => (
            <button
              key={example}
              onClick={() => setUsername(example)}
              className="px-2 py-1 text-xs bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
