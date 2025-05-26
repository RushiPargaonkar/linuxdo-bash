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
 * @returns {string} - Tailwind CSS 背景颜色类名
 */
export const getUserAvatarColor = (username) => {
  if (!username) return 'bg-gray-500';
  
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
 * 获取用户名的首字母（大写）
 * @param {string} username - 用户名
 * @returns {string} - 首字母大写
 */
export const getUserInitial = (username) => {
  if (!username) return '?';
  return username.charAt(0).toUpperCase();
};
