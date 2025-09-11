import React, { useState, useEffect } from 'react';
import './ChatSidebar.css';

const ChatSidebar = ({ chats, activeChatId, onChatSelect, onNewChat, onDeleteChat, onRenameChat }) => {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingChatId, setEditingChatId] = useState(null);
  const [editValue, setEditValue] = useState('');

  // Handle clicks outside the menu to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if the click is outside any menu or menu button
      const isMenuClick = event.target.closest('.chat-menu');
      const isMenuButtonClick = event.target.closest('.menu-button');
      
      if (!isMenuClick && !isMenuButtonClick && openMenuId) {
        setOpenMenuId(null);
      }
    };

    // Add event listener if menu is open
    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuId]);

  const handleMenuClick = (e, chatId) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === chatId ? null : chatId);
  };

  const handleDeleteChat = (e, chatId) => {
    e.stopPropagation();
    
    if (window.confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
      onDeleteChat(chatId);
    }
    
    setOpenMenuId(null);
  };

  const handleRenameChat = (e, chatId) => {
    e.stopPropagation();
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setEditingChatId(chatId);
      setEditValue(chat.title);
      setOpenMenuId(null);
    }
  };

  const handleRenameSubmit = (e) => {
    e.preventDefault();
    if (editingChatId && editValue.trim()) {
      const sanitizedValue = editValue.trim().substring(0, 50); // Limit to 50 characters
      onRenameChat(editingChatId, sanitizedValue);
      setEditingChatId(null);
      setEditValue('');
    }
  };

  const handleRenameCancel = () => {
    setEditingChatId(null);
    setEditValue('');
  };

  const handleRenameKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleRenameSubmit(e);
    } else if (e.key === 'Escape') {
      handleRenameCancel();
    }
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
              {editingChatId === chat.id ? (
                <form onSubmit={handleRenameSubmit} className="rename-form">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleRenameKeyPress}
                    onBlur={handleRenameCancel}
                    className="rename-input"
                    maxLength={50}
                    autoFocus
                  />
                </form>
              ) : (
                <>
                  <span className="chat-title">{chat.title}</span>
                  <span className="chat-preview">
                    {chat.lastMessage || 'No messages yet'}
                  </span>
                </>
              )}
            </div>
            {editingChatId !== chat.id && (
              <div className={`chat-menu ${openMenuId === chat.id ? 'open' : ''}`}>
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
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatSidebar;
