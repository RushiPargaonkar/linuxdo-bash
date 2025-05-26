import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle } from 'lucide-react';

const Chat = ({ socket, messages, currentUsername, onSendMessage }) => {
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    onSendMessage(inputMessage.trim());
    setInputMessage('');
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
          <div className="text-center text-gray-500 py-8">
            <MessageCircle size={32} className="mx-auto mb-2 opacity-50" />
            <p>还没有消息</p>
            <p className="text-sm">开始聊天吧！</p>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, dateMessages]) => (
            <div key={date}>
              {/* 日期分隔符 */}
              <div className="flex items-center justify-center my-4">
                <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
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
                    {!isOwn && showAvatar && (
                      <div className="flex items-center space-x-2 mb-1">
                        <div className="w-6 h-6 bg-linuxdo-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
                          {message.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-medium text-gray-600">
                          {message.username}
                        </span>
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
      <div className="p-4 border-t bg-gray-50">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="输入消息..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-linuxdo-500 focus:border-transparent text-sm"
            maxLength={500}
          />
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
        
        {/* 字符计数 */}
        <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
          <span>按 Enter 发送消息</span>
          <span>{inputMessage.length}/500</span>
        </div>
      </div>
    </div>
  );
};

export default Chat;
