import React, { useState } from 'react';
import './ChatSidebar.css';

const ChatSidebar = ({ chats, activeChatId, onChatSelect, onNewChat, onDeleteChat }) => {
  const [openMenuId, setOpenMenuId] = useState(null);

  const handleMenuClick = (e, chatId) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === chatId ? null : chatId);
  };

  const handleDeleteChat = (e, chatId) => {
    e.stopPropagation();
    onDeleteChat(chatId);
    setOpenMenuId(null);
  };

  const handleRenameChat = (e, chatId) => {
    e.stopPropagation();
    // TODO: Implement rename functionality
    console.log('Rename chat:', chatId);
    setOpenMenuId(null);
  };

  const handleChatClick = (chatId) => {
    setOpenMenuId(null);
    onChatSelect(chatId);
  };

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
            onClick={() => handleChatClick(chat.id)}
          >
            <div className="chat-item-content">
              <span className="chat-title">{chat.title}</span>
              <span className="chat-preview">
                {chat.lastMessage || 'No messages yet'}
              </span>
            </div>
            <div className="chat-menu">
              <button 
                className="menu-button"
                onClick={(e) => handleMenuClick(e, chat.id)}
              >
                ⋯
              </button>
              {openMenuId === chat.id && (
                <div className="menu-dropdown">
                  <button 
                    className="menu-item"
                    onClick={(e) => handleRenameChat(e, chat.id)}
                  >
                    Rename
                  </button>
                  <button 
                    className="menu-item delete"
                    onClick={(e) => handleDeleteChat(e, chat.id)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatSidebar;
