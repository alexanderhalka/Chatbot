import React from 'react';
import './ChatSidebar.css';

const ChatSidebar = ({ chats, activeChatId, onChatSelect, onNewChat }) => {
  return (
    <div className="chat-sidebar">
      <div className="sidebar-header">
        <h2>Chats</h2>
        <button 
          onClick={onNewChat} 
          className="new-chat-btn"
          title="Start new chat"
        >
          ➕ New Chat
        </button>
      </div>
      
      <div className="chat-list">
        {chats.map((chat) => (
          <div
            key={chat.id}
            className={`chat-item ${chat.id === activeChatId ? 'active' : ''}`}
            onClick={() => onChatSelect(chat.id)}
          >
            <div className="chat-item-content">
              <span className="chat-title">{chat.title}</span>
              <span className="chat-preview">
                {chat.lastMessage || 'No messages yet'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatSidebar;
