// 预定义的头像颜色数组
export const AVATAR_COLORS = [
  'bg-red-500',
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-orange-500',
  'bg-cyan-500',
  'bg-lime-500',
  'bg-emerald-500',
  'bg-violet-500',
  'bg-fuchsia-500',
  'bg-rose-500',
  'bg-sky-500',
  'bg-amber-500',
  'bg-slate-500'
];

/**
 * 根据用户名生成一致的头像颜色
 * 使用哈希函数确保同一用户名总是得到相同的颜色
 * @param {string} username - 用户名
 * @param {Object} customAvatar - 自定义头像设置
 * @returns {string} - Tailwind CSS 背景颜色类名
 */
export const getUserAvatarColor = (username, customAvatar = null) => {
  if (!username) return 'bg-gray-500';

  // 如果有自定义头像设置，优先使用
  if (customAvatar && customAvatar.type === 'color') {
    return customAvatar.value;
  }

  // 如果是表情头像，返回默认背景
  if (customAvatar && customAvatar.type === 'emoji') {
    return 'bg-gray-200 dark:bg-gray-700';
  }

  // 使用简单的哈希函数确保同一用户名总是得到相同的颜色
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    const char = username.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }

  // 确保hash为正数并映射到颜色数组
  const colorIndex = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[colorIndex];
};

/**
 * 获取用户名的首字母（大写）或自定义头像内容
 * @param {string} username - 用户名
 * @param {Object} customAvatar - 自定义头像设置
 * @returns {string} - 首字母大写或表情
 */
export const getUserInitial = (username, customAvatar = null) => {
  if (!username) return '?';

  // 如果有自定义表情头像，返回表情
  if (customAvatar && customAvatar.type === 'emoji') {
    return customAvatar.value;
  }

  // 否则返回用户名首字母
  return username.charAt(0).toUpperCase();
};

/**
 * 获取用户头像设置的存储键
 * @param {string} username - 用户名
 * @returns {string} - localStorage 键名
 */
export const getAvatarStorageKey = (username) => {
  return `avatar_${username}`;
};

/**
 * 保存用户头像设置
 * @param {string} username - 用户名
 * @param {Object} avatar - 头像设置
 */
export const saveUserAvatar = (username, avatar) => {
  if (!username) return;
  const key = getAvatarStorageKey(username);
  localStorage.setItem(key, JSON.stringify(avatar));
};

/**
 * 获取用户头像设置
 * @param {string} username - 用户名
 * @returns {Object|null} - 头像设置或null
 */
export const getUserAvatar = (username) => {
  if (!username) return null;
  const key = getAvatarStorageKey(username);
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : null;
};
