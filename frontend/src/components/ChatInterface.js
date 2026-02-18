import React, { useState, useRef, useEffect } from 'react';
import './ChatInterface.css';

const ChatInterface = ({ 
  messages, 
  setMessages, 
  sessionId, 
  onSendMessage, 
  isLoading,
  onEditMessage,
  onDeleteMessage,
  onRedoAiMessage
}) => {
  // Draft message per chat: { [sessionId]: string } so switching chats preserves in-progress text
  const [draftBySession, setDraftBySession] = useState({});
  // Edit state per chat: { [sessionId]: { editingIndex, editText } } so switching chats preserves in-progress edits
  const [editStateBySession, setEditStateBySession] = useState({});

  const inputMessage = draftBySession[sessionId] ?? '';
  const setInputMessage = (value) => {
    setDraftBySession(prev => ({ ...prev, [sessionId]: typeof value === 'function' ? value(prev[sessionId] ?? '') : value }));
  };
  const [openMessageMenuIndex, setOpenMessageMenuIndex] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const editTextareaRef = useRef(null);
  const messageRowRefs = useRef({});

  const currentEdit = editStateBySession[sessionId];
  const editingIndex = currentEdit?.editingIndex ?? null;
  const editText = currentEdit?.editText ?? '';
  const captureWidth = currentEdit?.captureWidth;
  const captureHeight = currentEdit?.captureHeight;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus the message input when switching to another chat so the user can type immediately
  useEffect(() => {
    textareaRef.current?.focus();
  }, [sessionId]);

  // Close message menu when clicking outside (same as convo sidebar)
  useEffect(() => {
    const handleClickOutside = (e) => {
      const isMessageMenu = e.target.closest('.message-menu');
      const isMessageMenuButton = e.target.closest('.message-menu-button');
      if (!isMessageMenu && !isMessageMenuButton && openMessageMenuIndex !== null) {
        setOpenMessageMenuIndex(null);
      }
    };
    if (openMessageMenuIndex !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMessageMenuIndex]);

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || isLoading) return;

    const messageToSend = inputMessage;
    setInputMessage('');
    
    await onSendMessage(messageToSend);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  // Focus and size textarea to fill the locked bubble (no resize of the box)
  useEffect(() => {
    if (editingIndex !== null && editTextareaRef.current) {
      const ta = editTextareaRef.current;
      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);
    }
  }, [sessionId, editingIndex]);

  const handleMessageMenuClick = (e, index) => {
    e.stopPropagation();
    setOpenMessageMenuIndex(openMessageMenuIndex === index ? null : index);
  };

  const handleEdit = (index) => {
    if (messages[index] && messages[index].sender !== 'user') return;
    const rowEl = messageRowRefs.current[index];
    const contentEl = rowEl?.firstElementChild;
    let captureWidth = null;
    let captureHeight = null;
    if (contentEl) {
      captureWidth = contentEl.offsetWidth;
      captureHeight = contentEl.offsetHeight;
    }
    setEditStateBySession(prev => ({
      ...prev,
      [sessionId]: {
        editingIndex: index,
        editText: messages[index].text,
        captureWidth,
        captureHeight
      }
    }));
  };

  const handleCancelEdit = () => {
    setEditStateBySession(prev => {
      const next = { ...prev };
      delete next[sessionId];
      return next;
    });
  };

  const setEditTextForSession = (value) => {
    setEditStateBySession(prev => ({
      ...prev,
      [sessionId]: prev[sessionId]
        ? { ...prev[sessionId], editText: value }
        : { editingIndex: null, editText: value }
    }));
  };

  const handleSaveEdit = async () => {
    if (!editText.trim() || editingIndex === null) {
      handleCancelEdit();
      return;
    }
    const hasSubsequentMessages = editingIndex < messages.length - 1;
    if (hasSubsequentMessages) {
      const confirmSave = window.confirm(
        'Editing this message will delete all messages after it. Continue?'
      );
      if (!confirmSave) return;
    }
    const indexToSave = editingIndex;
    const textToSave = editText.trim();
    // Close edit UI immediately so the message shows normally while waiting for the AI reply
    setEditStateBySession(prev => {
      const next = { ...prev };
      delete next[sessionId];
      return next;
    });
    await onEditMessage(indexToSave, textToSave);
  };

  const handleDelete = async (index) => {
    if (messages[index] && messages[index].sender !== 'user') return;
    setOpenMessageMenuIndex(null);
    await onDeleteMessage(index);
  };

  const handleEditFromMenu = (e, index) => {
    e.stopPropagation();
    setOpenMessageMenuIndex(null);
    handleEdit(index);
  };

  const handleCopyFromMenu = async (e, index) => {
    e.stopPropagation();
    const text = messages[index]?.text;
    if (text != null) {
      try {
        await navigator.clipboard.writeText(text);
        setOpenMessageMenuIndex(null);
      } catch (err) {
        console.error('Copy failed:', err);
      }
    }
  };

  const handleRedoFromMenu = async (e, index) => {
    e.stopPropagation();
    setOpenMessageMenuIndex(null);
    if (onRedoAiMessage) await onRedoAiMessage(index);
  };

  const handleEditKeyPress = (e) => {
    if (e.key === 'Enter' && e.shiftKey === false) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  const canEditDelete = (message) => {
    return message && message.sender === 'user';
  };

  const handleEditInputChange = (e) => {
    setEditTextForSession(e.target.value);
  };

  return (
    <div className="chat-container">
      <div className="messages-container">
        {messages.map((message, index) => (
          <div
            key={message.id}
            ref={(el) => { messageRowRefs.current[index] = el; }}
            className={`message ${message.sender}`}
          >
            <div
              className="message-content"
              style={editingIndex === index && captureWidth != null && captureHeight != null
                ? { width: captureWidth, height: captureHeight, minWidth: captureWidth, minHeight: captureHeight, boxSizing: 'border-box' }
                : undefined
              }
            >
              {editingIndex === index ? (
                <div className="message-edit-container">
                  <textarea
                    ref={editTextareaRef}
                    className="message-edit-input"
                    value={editText}
                    onChange={handleEditInputChange}
                    onKeyDown={handleEditKeyPress}
                  />
                  <div className="message-edit-actions">
                    <button
                      className="message-edit-save"
                      onClick={handleSaveEdit}
                      title="Confirm"
                    >
                      Confirm
                    </button>
                    <button
                      className="message-edit-cancel"
                      onClick={handleCancelEdit}
                      title="Cancel"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : message.loading ? (
                <div className="loading-indicator">
                  <div className="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="message-text">{message.text}</div>
                  <div className="message-footer">
                    <div className="message-footer-right">
                      {message.sender === 'user' && (
                        <div className={`message-menu ${openMessageMenuIndex === index ? 'open' : ''}`}>
                          <button
                            type="button"
                            className="message-menu-button"
                            onClick={(e) => handleMessageMenuClick(e, index)}
                            title="More options"
                          >
                            ⋯
                          </button>
                          {openMessageMenuIndex === index && (
                            <div className="message-menu-dropdown">
                              <button type="button" className="message-menu-item" onClick={(e) => handleCopyFromMenu(e, index)}>Copy</button>
                              <button type="button" className="message-menu-item" onClick={(e) => handleEditFromMenu(e, index)}>Edit</button>
                              <button
                                type="button"
                                className="message-menu-item delete"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMessageMenuIndex(null);
                                  handleDelete(index);
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="message-timestamp">{message.timestamp}</div>
                      {message.sender === 'ai' && (
                        <div className={`message-menu ${openMessageMenuIndex === index ? 'open' : ''}`}>
                          <button
                            type="button"
                            className="message-menu-button message-menu-button-ai"
                            onClick={(e) => handleMessageMenuClick(e, index)}
                            title="More options"
                          >
                            ⋯
                          </button>
                          {openMessageMenuIndex === index && (
                            <div className="message-menu-dropdown">
                              <button type="button" className="message-menu-item" onClick={(e) => handleRedoFromMenu(e, index)}>Redo</button>
                              <button type="button" className="message-menu-item" onClick={(e) => handleCopyFromMenu(e, index)}>Copy</button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="message ai">
            <div className="message-content">
              <div className="loading-indicator">
                <div className="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <form className="input-container" onSubmit={sendMessage}>
        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message here..."
            rows="1"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            className="send-button"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>

      </form>
    </div>
  );
};

export default ChatInterface;
