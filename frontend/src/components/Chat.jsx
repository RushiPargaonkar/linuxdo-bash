import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, Smile } from 'lucide-react';
import { getUserAvatarColor, getUserInitial, getUserAvatar } from '../utils/avatarColors';

// 常用表情列表
const EMOJI_LIST = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣',
  '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰',
  '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜',
  '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏',
  '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
  '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠',
  '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨',
  '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥',
  '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧',
  '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐',
  '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑',
  '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻',
  '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸',
  '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '👋',
  '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️',
  '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕',
  '👇', '☝️', '👍', '👎', '👊', '✊', '🤛', '🤜',
  '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
  '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖',
  '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️',
  '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈',
  '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐',
  '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️'
];

const Chat = ({ socket, messages, currentUsername, onSendMessage }) => {
  const [inputMessage, setInputMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [userAvatars, setUserAvatars] = useState({});
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const emojiPickerRef = useRef(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 加载用户头像设置
  useEffect(() => {
    const loadUserAvatars = () => {
      const avatars = {};
      const usernames = new Set();

      // 从消息中收集所有用户名
      messages.forEach(message => {
        if (message.username) {
          usernames.add(message.username);
        }
      });

      // 加载每个用户的头像设置
      usernames.forEach(username => {
        const avatar = getUserAvatar(username);
        if (avatar) {
          avatars[username] = avatar;
        }
      });

      setUserAvatars(avatars);
    };

    loadUserAvatars();
  }, [messages]);

  // 点击外部关闭表情选择器
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    onSendMessage(inputMessage.trim());
    setInputMessage('');
    setShowEmojiPicker(false);
  };

  const handleEmojiSelect = (emoji) => {
    setInputMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const toggleEmojiPicker = () => {
    setShowEmojiPicker(!showEmojiPicker);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return '今天';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return '昨天';
    } else {
      return date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  // 按日期分组消息
  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatDate(message.createdAt || message.timestamp);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  return (
    <div className="chat-container">
      {/* 聊天头部 */}
      <div className="chat-header">
        <div className="flex items-center space-x-2">
          <MessageCircle size={20} />
          <span>聊天室</span>
        </div>
      </div>

      {/* 消息列表 */}
      <div className="chat-messages">
        {Object.keys(groupedMessages).length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <MessageCircle size={32} className="mx-auto mb-2 opacity-50" />
            <p>还没有消息</p>
            <p className="text-sm">开始聊天吧！</p>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, dateMessages]) => (
            <div key={date}>
              {/* 日期分隔符 */}
              <div className="flex items-center justify-center my-4">
                <div className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-3 py-1 rounded-full">
                  {date}
                </div>
              </div>

              {/* 该日期的消息 */}
              {dateMessages.map((message, index) => {
                const isOwn = message.username === currentUsername;
                const showAvatar = index === 0 ||
                  dateMessages[index - 1].username !== message.username;

                return (
                  <div
                    key={message.id || index}
                    className={`chat-message ${isOwn ? 'own' : 'other'} fade-in`}
                  >
                    {/* 显示所有消息的用户名和头像（当用户变化时） */}
                    {showAvatar && (
                      <div className={`flex items-center space-x-2 mb-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        {!isOwn && (
                          <div className={`w-6 h-6 ${getUserAvatarColor(message.username, userAvatars[message.username])} text-white rounded-full flex items-center justify-center text-xs font-medium`}>
                            {getUserInitial(message.username, userAvatars[message.username])}
                          </div>
                        )}
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                          {message.username}
                        </span>
                        {isOwn && (
                          <div className={`w-6 h-6 ${getUserAvatarColor(message.username, userAvatars[message.username])} text-white rounded-full flex items-center justify-center text-xs font-medium`}>
                            {getUserInitial(message.username, userAvatars[message.username])}
                          </div>
                        )}
                      </div>
                    )}

                    <div className={`message-bubble ${isOwn ? 'own' : 'other'}`}>
                      {message.message}
                    </div>

                    <div className="message-meta">
                      {formatTime(message.createdAt || message.timestamp)}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 relative">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="输入消息..."
              className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-linuxdo-500 focus:border-transparent text-sm"
              maxLength={500}
            />
            {/* 表情按钮 */}
            <button
              type="button"
              onClick={toggleEmojiPicker}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <Smile size={16} />
            </button>
          </div>

          <button
            type="submit"
            disabled={!inputMessage.trim()}
            className={`px-3 py-2 rounded-lg text-white transition-colors ${
              inputMessage.trim()
                ? 'bg-linuxdo-500 hover:bg-linuxdo-600'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            <Send size={16} />
          </button>
        </form>

        {/* 表情选择器 */}
        {showEmojiPicker && (
          <div
            ref={emojiPickerRef}
            className="absolute bottom-full right-4 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-3 z-50"
            style={{ width: '280px', maxHeight: '200px' }}
          >
            <div className="grid grid-cols-8 gap-1 overflow-y-auto max-h-40">
              {EMOJI_LIST.map((emoji, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleEmojiSelect(emoji)}
                  className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 字符计数 */}
        <div className="flex justify-between items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
          <span>按 Enter 发送消息</span>
          <span>{inputMessage.length}/500</span>
        </div>
      </div>
    </div>
  );
};

export default Chat;
