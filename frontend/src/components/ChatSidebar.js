import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useConfirm } from '../ConfirmDialogContext';
import './ChatSidebar.css';

const ChevronLeft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const ChevronRight = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M9 18l6-6-6-6" />
  </svg>
);

const ChatSidebar = ({ chats, activeChatId, onChatSelect, onNewChat, onDeleteChat, onRenameChat }) => {
  const confirm = useConfirm();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('chatbot_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingChatId, setEditingChatId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [truncatedTitleIds, setTruncatedTitleIds] = useState(new Set());
  const titleRefs = useRef({});

  // Show tooltip on chat title only when text is truncated
  useLayoutEffect(() => {
    const next = new Set();
    chats.forEach((chat) => {
      if (editingChatId === chat.id) return;
      const el = titleRefs.current[chat.id];
      if (el && el.scrollWidth > el.clientWidth) next.add(chat.id);
    });
    setTruncatedTitleIds((prev) =>
      prev.size === next.size && [...prev].every((id) => next.has(id)) ? prev : next
    );
  }, [chats, editingChatId]);

  useEffect(() => {
    const onResize = () => {
      const next = new Set();
      chats.forEach((chat) => {
        if (editingChatId === chat.id) return;
        const el = titleRefs.current[chat.id];
        if (el && el.scrollWidth > el.clientWidth) next.add(chat.id);
      });
      setTruncatedTitleIds((prev) =>
        prev.size === next.size && [...prev].every((id) => next.has(id)) ? prev : next
      );
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [chats, editingChatId]);

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

  const handleDeleteChat = async (e, chatId) => {
    e.stopPropagation();
    setOpenMenuId(null);
    const ok = await confirm({
      title: 'Delete chat?',
      message: 'Are you sure you want to delete this chat? This action cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      danger: true,
    });
    if (ok) onDeleteChat(chatId);
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
      const sanitizedValue = editValue.trim();
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

  const toggleCollapse = (collapsed) => {
    setSidebarCollapsed(collapsed);
    try {
      localStorage.setItem('chatbot_sidebar_collapsed', collapsed ? 'true' : 'false');
    } catch {
      /* ignore */
    }
  };

  if (sidebarCollapsed) {
    return (
      <div className="chat-sidebar chat-sidebar--collapsed" aria-label="Collapsed chat navigation">
        <div className="sidebar-collapsed-inner">
          <button
            type="button"
            className="sidebar-icon-btn sidebar-expand-btn"
            onClick={() => toggleCollapse(false)}
            title="Open chat list"
            aria-label="Open chat list"
          >
            <ChevronRight />
          </button>
          <button
            type="button"
            className="sidebar-icon-btn sidebar-collapsed-new-chat"
            onClick={onNewChat}
            title="New chat"
            aria-label="New chat"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-header-top">
          <h2>Chats</h2>
          <button
            type="button"
            className="sidebar-icon-btn sidebar-collapse-btn"
            onClick={() => toggleCollapse(true)}
            title="Collapse chat list"
            aria-label="Collapse chat list"
          >
            <ChevronLeft />
          </button>
        </div>
        <button
          type="button"
          onClick={onNewChat}
          className="new-chat-btn"
          title="Start new chat"
        >
          New Chat
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
                    autoFocus
                  />
                </form>
              ) : (
                <>
                  <span
                    ref={(el) => { titleRefs.current[chat.id] = el; }}
                    className="chat-title"
                    title={truncatedTitleIds.has(chat.id) ? chat.title : undefined}
                  >
                    {chat.title}
                  </span>
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
