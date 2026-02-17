import React, { useState, useRef, useEffect } from 'react';
import './ChatInterface.css';

const ChatInterface = ({ 
  messages, 
  setMessages, 
  sessionId, 
  onSendMessage, 
  isLoading,
  userStatus,
  onEditMessage,
  onDeleteMessage
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editText, setEditText] = useState('');
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const editTextareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const isLimitReached = userStatus?.limit_enabled === false ? false : 
    messages.some(msg => 
      msg.sender === 'error' && msg.text.includes('Daily limit reached')
    );

  // Focus edit textarea when entering edit mode
  useEffect(() => {
    if (editingIndex !== null && editTextareaRef.current) {
      editTextareaRef.current.focus();
      editTextareaRef.current.setSelectionRange(
        editTextareaRef.current.value.length,
        editTextareaRef.current.value.length
      );
    }
  }, [editingIndex]);

  const handleEdit = (index) => {
    if (messages[index] && messages[index].sender !== 'error' && messages[index].sender !== 'system') {
      // Warn user that editing will delete subsequent messages
      const hasSubsequentMessages = index < messages.length - 1;
      if (hasSubsequentMessages) {
        const confirmEdit = window.confirm(
          'Editing this message will delete all messages after it. Continue?'
        );
        if (!confirmEdit) {
          return;
        }
      }
      setEditingIndex(index);
      setEditText(messages[index].text);
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditText('');
  };

  const handleSaveEdit = async () => {
    if (!editText.trim() || editingIndex === null) {
      handleCancelEdit();
      return;
    }

    const success = await onEditMessage(editingIndex, editText.trim());
    if (success) {
      setEditingIndex(null);
      setEditText('');
    }
  };

  const handleDelete = async (index) => {
    await onDeleteMessage(index);
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
    return message && message.sender !== 'error' && message.sender !== 'system';
  };

  return (
    <div className="chat-container">
      <div className="messages-container">
        {messages.length === 0 && (
          <div className="welcome-message">
            <h2>Welcome to ChatGPT Clone!</h2>
            <p>Start a conversation by typing a message below.</p>
            <p><small>I'll remember our conversation and important details about you!</small></p>
          </div>
        )}
        
        {messages.map((message, index) => (
          <div
            key={message.id}
            className={`message ${message.sender}`}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div className="message-content">
              {editingIndex === index ? (
                <div className="message-edit-container">
                  <textarea
                    ref={editTextareaRef}
                    className="message-edit-input"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={handleEditKeyPress}
                    rows="3"
                  />
                  <div className="message-edit-actions">
                    <button
                      className="message-edit-save"
                      onClick={handleSaveEdit}
                    >
                      Save
                    </button>
                    <button
                      className="message-edit-cancel"
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="message-text">{message.text}</div>
                  <div className="message-footer">
                    <div className="message-timestamp">{message.timestamp}</div>
                    {canEditDelete(message) && hoveredIndex === index && (
                      <div className="message-actions">
                        <button
                          className="message-action-btn edit-btn"
                          onClick={() => handleEdit(index)}
                          title="Edit message"
                        >
                          ✏️
                        </button>
                        <button
                          className="message-action-btn delete-btn"
                          onClick={() => handleDelete(index)}
                          title="Delete message"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
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
            placeholder={isLimitReached ? "Daily limit reached." : "Type your message here..."}
            rows="1"
            disabled={isLimitReached}
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isLoading || isLimitReached}
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
