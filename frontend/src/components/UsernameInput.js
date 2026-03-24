import React, { useState, useEffect } from 'react';
import './UsernameInput.css';

const UsernameInput = ({ onUsernameSet }) => {
  const [username, setUsername] = useState('');

  useEffect(() => {
    // Check if username is already set in localStorage
    const savedUsername = localStorage.getItem('chatbot_username');
    if (savedUsername) {
      setUsername(savedUsername);
      onUsernameSet(savedUsername);
    }
  }, [onUsernameSet]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim()) {
      const cleanUsername = username.trim();
      localStorage.setItem('chatbot_username', cleanUsername);
      onUsernameSet(cleanUsername);
    }
  };

  const handleChange = (e) => {
    setUsername(e.target.value);
  };

  return (
    <div className="username-input-container">
      <form onSubmit={handleSubmit} className="username-form">
        <label htmlFor="username" className="username-label">
          Enter a username:
        </label>
        <div className="input-group">
          <input
            type="text"
            id="username"
            value={username}
            onChange={handleChange}
            placeholder="Enter username..."
            className="username-field"
            maxLength={20}
            required
          />
          <button type="submit" className="submit-btn" disabled={!username.trim()}>
            Start Chatting
          </button>
        </div>
      </form>
    </div>
  );
};

export default UsernameInput;
