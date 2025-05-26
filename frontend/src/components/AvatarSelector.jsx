import React, { useState, useRef, useEffect } from 'react';
import { User, Camera, Palette, X } from 'lucide-react';

// 预定义的头像样式
const AVATAR_STYLES = [
  { type: 'color', value: 'bg-red-500', label: '红色' },
  { type: 'color', value: 'bg-blue-500', label: '蓝色' },
  { type: 'color', value: 'bg-green-500', label: '绿色' },
  { type: 'color', value: 'bg-yellow-500', label: '黄色' },
  { type: 'color', value: 'bg-purple-500', label: '紫色' },
  { type: 'color', value: 'bg-pink-500', label: '粉色' },
  { type: 'color', value: 'bg-indigo-500', label: '靛蓝' },
  { type: 'color', value: 'bg-teal-500', label: '青色' },
  { type: 'color', value: 'bg-orange-500', label: '橙色' },
  { type: 'color', value: 'bg-cyan-500', label: '青蓝' },
  { type: 'color', value: 'bg-lime-500', label: '柠檬绿' },
  { type: 'color', value: 'bg-emerald-500', label: '翡翠绿' },
  { type: 'color', value: 'bg-violet-500', label: '紫罗兰' },
  { type: 'color', value: 'bg-fuchsia-500', label: '紫红' },
  { type: 'color', value: 'bg-rose-500', label: '玫瑰红' },
  { type: 'color', value: 'bg-sky-500', label: '天蓝' },
  { type: 'color', value: 'bg-amber-500', label: '琥珀' },
  { type: 'color', value: 'bg-slate-500', label: '石板灰' }
];

// 预定义的头像表情
const AVATAR_EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣',
  '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰',
  '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜',
  '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏',
  '🤠', '😈', '👿', '👹', '👺', '🤡', '👻', '💀',
  '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻',
  '😼', '😽', '🙀', '😿', '😾', '🐶', '🐱', '🐭',
  '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁'
];

const AvatarSelector = ({ currentAvatar, onAvatarChange, onClose }) => {
  const [selectedType, setSelectedType] = useState('color');
  const modalRef = useRef(null);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleAvatarSelect = (avatar) => {
    onAvatarChange(avatar);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
      >
        {/* 头部 */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            选择头像
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* 当前头像预览 */}
        <div className="flex items-center justify-center mb-6">
          <div className="text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-2 ${
              currentAvatar?.type === 'emoji' ? 'bg-gray-200 dark:bg-gray-700' : currentAvatar?.value || 'bg-gray-500'
            }`}>
              {currentAvatar?.type === 'emoji' ? currentAvatar.value : currentAvatar?.initial || '?'}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">当前头像</p>
          </div>
        </div>

        {/* 类型选择 */}
        <div className="flex space-x-2 mb-4">
          <button
            onClick={() => setSelectedType('color')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedType === 'color'
                ? 'bg-linuxdo-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <Palette size={16} />
            <span>颜色</span>
          </button>
          <button
            onClick={() => setSelectedType('emoji')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedType === 'emoji'
                ? 'bg-linuxdo-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <User size={16} />
            <span>表情</span>
          </button>
        </div>

        {/* 选择区域 */}
        <div className="max-h-60 overflow-y-auto">
          {selectedType === 'color' ? (
            <div className="grid grid-cols-6 gap-2">
              {AVATAR_STYLES.map((style, index) => (
                <button
                  key={index}
                  onClick={() => handleAvatarSelect({ type: 'color', value: style.value, label: style.label })}
                  className={`w-12 h-12 rounded-full ${style.value} hover:scale-110 transition-transform border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600`}
                  title={style.label}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-8 gap-2">
              {AVATAR_EMOJIS.map((emoji, index) => (
                <button
                  key={index}
                  onClick={() => handleAvatarSelect({ type: 'emoji', value: emoji })}
                  className="w-10 h-10 flex items-center justify-center text-2xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end space-x-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvatarSelector;
