import React, { useState, useEffect } from 'react';
import './App.css';
import ChatInterface from './components/ChatInterface';
import ChatSidebar from './components/ChatSidebar';
import UsernameInput from './components/UsernameInput';

function App() {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [nextChatNumber, setNextChatNumber] = useState(1);
  const [username, setUsername] = useState(null);
  const [userStatus, setUserStatus] = useState(null);
  const [showLogin, setShowLogin] = useState(false);

  // Load user's chats from localStorage
  const loadUserChats = (username) => {
    const userChatsKey = `chatbot_chats_${username}`;
    const savedChats = localStorage.getItem(userChatsKey);
    
    if (savedChats) {
      const parsedChats = JSON.parse(savedChats);
      setChats(parsedChats.chats);
      setActiveChatId(parsedChats.activeChatId);
      setNextChatNumber(parsedChats.nextChatNumber);
      setIsInitialized(true);
    } else {
      // Create initial chat for new user
      const initialChat = {
        id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: 'Chat 1',
        messages: [],
        lastMessage: null
      };
      
      setChats([initialChat]);
      setActiveChatId(initialChat.id);
      setNextChatNumber(2);
      setIsInitialized(true);
      
      // Save to localStorage
      saveUserChats(username, [initialChat], initialChat.id, 2);
    }
  };

  // Save user's chats to localStorage
  const saveUserChats = (username, chats, activeChatId, nextChatNumber) => {
    const userChatsKey = `chatbot_chats_${username}`;
    const chatData = {
      chats,
      activeChatId,
      nextChatNumber
    };
    localStorage.setItem(userChatsKey, JSON.stringify(chatData));
  };

  // Check for saved username on app start
  useEffect(() => {
    const savedUsername = localStorage.getItem('chatbot_username');
    if (savedUsername) {
      setUsername(savedUsername);
    } else {
      setShowLogin(true);
    }
  }, []);

  // Load user's chats when username changes
  useEffect(() => {
    if (username && !showLogin) {
      loadUserChats(username);
      fetchUserStatus();
    }
  }, [username, showLogin]);

  const fetchUserStatus = async () => {
    try {
      const response = await fetch('/user/status', {
        headers: {
          'x-user': `test-${username}`
        }
      });
      const data = await response.json();
      setUserStatus(data);
    } catch (error) {
      console.error('Error fetching user status:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('chatbot_username');
    setUsername(null);
    setUserStatus(null);
    setChats([]);
    setActiveChatId(null);
    setNextChatNumber(1);
    setIsInitialized(false);
    setShowLogin(true);
  };

  const handleUsernameSet = (newUsername) => {
    if (newUsername) {
      setUsername(newUsername);
      setShowLogin(false);
    } else {
      setUsername(null);
      setShowLogin(true);
    }
  };

  const createNewChat = () => {
    const newChat = {
      id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: `Chat ${nextChatNumber}`,
      messages: [],
      lastMessage: null
    };
    
    const updatedChats = [...chats, newChat];
    setChats(updatedChats);
    setActiveChatId(newChat.id);
    const newNextNumber = nextChatNumber + 1;
    setNextChatNumber(newNextNumber);
    
    // Save to localStorage
    saveUserChats(username, updatedChats, newChat.id, newNextNumber);
  };

  const selectChat = (chatId) => {
    setActiveChatId(chatId);
    // Save active chat change to localStorage
    saveUserChats(username, chats, chatId, nextChatNumber);
  };

  const deleteChat = (chatId) => {
    const filteredChats = chats.filter(chat => chat.id !== chatId);
    let newActiveChatId = activeChatId;
    let newNextNumber = nextChatNumber;
    
    // If we're deleting the active chat, switch to another chat
    if (chatId === activeChatId) {
      if (filteredChats.length > 0) {
        newActiveChatId = filteredChats[0].id;
      } else {
        // If no chats left, create a new one
        const newChat = {
          id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: 'Chat 1',
          messages: [],
          lastMessage: null
        };
        filteredChats.push(newChat);
        newActiveChatId = newChat.id;
        newNextNumber = 2; // Reset counter for fresh start
      }
    }
    
    setChats(filteredChats);
    setActiveChatId(newActiveChatId);
    setNextChatNumber(newNextNumber);
    
    // Save to localStorage
    saveUserChats(username, filteredChats, newActiveChatId, newNextNumber);
  };

  const renameChat = (chatId, newTitle) => {
    // Validate the new title
    if (!newTitle || newTitle.trim().length === 0) {
      return; // Don't rename if empty
    }
    
    // Sanitize the title to prevent breaking the app
    const sanitizedTitle = newTitle.trim().substring(0, 50);
    
    const updatedChats = chats.map(chat => 
      chat.id === chatId 
        ? { ...chat, title: sanitizedTitle }
        : chat
    );
    
    setChats(updatedChats);
    
    // Save to localStorage
    saveUserChats(username, updatedChats, activeChatId, nextChatNumber);
  };

  const getActiveChat = () => {
    return chats.find(chat => chat.id === activeChatId);
  };

  const updateChatMessages = (chatId, messages) => {
    const updatedChats = chats.map(chat => 
      chat.id === chatId 
        ? { ...chat, messages, lastMessage: messages.length > 0 ? messages[messages.length - 1].text : null }
        : chat
    );
    
    setChats(updatedChats);
    
    // Save to localStorage
    saveUserChats(username, updatedChats, activeChatId, nextChatNumber);
  };

  const sendMessage = async (message) => {
    if (!activeChatId || !username) return;

    const activeChat = getActiveChat();
    if (!activeChat) return;

    const userMessage = {
      id: Date.now(),
      text: message,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString()
    };

    // Add user message immediately
    const updatedMessages = [...activeChat.messages, userMessage];
    updateChatMessages(activeChatId, updatedMessages);
    setIsLoading(true);

    try {
      const response = await fetch('/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user': `test-${username}`
        },
        body: JSON.stringify({ 
          message: message,
          session_id: activeChatId
        }),
      });

      const data = await response.json();

      if (response.status === 429) {
        // Daily limit reached
        const limitMessage = {
          id: Date.now() + 1,
          text: `Daily limit reached (${data.limit} messages). You can change your username to continue chatting.`,
          sender: 'error',
          timestamp: new Date().toLocaleTimeString()
        };
        
        const finalMessages = [...updatedMessages, limitMessage];
        updateChatMessages(activeChatId, finalMessages);
        
        // Update user status
        setUserStatus(prev => ({
          ...prev,
          daily_count: data.limit,
          remaining: 0
        }));
        return;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const aiMessage = {
        id: Date.now() + 1,
        text: data.response,
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString()
      };

      // Add AI response
      const finalMessages = [...updatedMessages, aiMessage];
      updateChatMessages(activeChatId, finalMessages);
      
      // Update user status after successful message
      if (data.daily_count !== undefined) {
        setUserStatus(prev => ({
          ...prev,
          daily_count: data.daily_count,
          remaining: data.limit - data.daily_count
        }));
      }
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        text: `Error: ${error.message}`,
        sender: 'error',
        timestamp: new Date().toLocaleTimeString()
      };
      
      const finalMessages = [...updatedMessages, errorMessage];
      updateChatMessages(activeChatId, finalMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const activeChat = getActiveChat();

  // Show username input if no username is set or if user wants to login
  if (showLogin || !username) {
    return (
      <div className="App">
        <div className="app-container">
          <div className="main-content">
            <header className="app-header">
              <h1>ChatGPT Clone</h1>
            </header>
            <main className="chat-main">
              <UsernameInput onUsernameSet={handleUsernameSet} />
            </main>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <div className="app-container">
        <ChatSidebar 
          chats={chats}
          activeChatId={activeChatId}
          onChatSelect={selectChat}
          onNewChat={createNewChat}
          onDeleteChat={deleteChat}
          onRenameChat={renameChat}
        />
        <div className="main-content">
          <header className="app-header">
            <div className="header-content">
              <h1>ChatGPT Clone</h1>
              <div className="header-right">
                {userStatus && (
                  <div className="user-status">
                    <span className="status-text">
                      Messages: {userStatus.daily_count}/{userStatus.daily_limit}
                    </span>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{width: `${(userStatus.daily_count / userStatus.daily_limit) * 100}%`}}
                      ></div>
                    </div>
                  </div>
                )}
                <button onClick={handleLogout} className="logout-btn">
                  Logout
                </button>
              </div>
            </div>
          </header>
          <main className="chat-main">
            {activeChat && (
              <ChatInterface 
                messages={activeChat.messages}
                setMessages={(messages) => updateChatMessages(activeChatId, messages)}
                sessionId={activeChatId}
                onSendMessage={sendMessage}
                isLoading={isLoading}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
