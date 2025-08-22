import React, { useState, useRef, useEffect } from 'react';
import './ChatInterface.css';

const ChatInterface = ({ 
  messages, 
  setMessages, 
  sessionId, 
  onSendMessage, 
  isLoading 
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

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

  const isLimitReached = messages.some(msg => 
    msg.sender === 'error' && msg.text.includes('Daily limit reached')
  );

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
        
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.sender}`}
          >
            <div className="message-content">
              <div className="message-text">{message.text}</div>
              <div className="message-timestamp">{message.timestamp}</div>
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
