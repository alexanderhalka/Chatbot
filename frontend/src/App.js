import React, { useState, useEffect } from 'react';
import './App.css';
import ChatInterface from './components/ChatInterface';
import ChatSidebar from './components/ChatSidebar';
import UsernameInput from './components/UsernameInput';
import PersonalityPicker from './components/PersonalityPicker';
import ThemeToggle from './components/ThemeToggle';
import { ThemeProvider } from './ThemeContext';

function App() {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [nextChatNumber, setNextChatNumber] = useState(1);
  const [username, setUsername] = useState(null);
  const [userStatus, setUserStatus] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showPersonalityPicker, setShowPersonalityPicker] = useState(false);
  const [personalities, setPersonalities] = useState({});

  // Fetch personalities from backend
  const fetchPersonalities = async () => {
    try {
      const response = await fetch('/personalities');
      const data = await response.json();
      setPersonalities(data.personalities);
    } catch (error) {
      console.error('Error fetching personalities:', error);
    }
  };

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
        title: 'New Chat',
        messages: [],
        lastMessage: null,
        personality: 'assistant' // Default personality
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
    fetchPersonalities();
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
    setShowPersonalityPicker(false);
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
    const activeChat = chats.find(c => c.id === activeChatId);
    // If already on an empty chat, do nothing
    if (activeChat && (!activeChat.messages || activeChat.messages.length === 0)) {
      return;
    }
    // If there's already an empty chat, switch to it instead of creating another
    const existingEmptyChat = chats.find(c => !c.messages || c.messages.length === 0);
    if (existingEmptyChat) {
      setActiveChatId(existingEmptyChat.id);
      saveUserChats(username, chats, existingEmptyChat.id, nextChatNumber);
      return;
    }
    const newChat = {
      id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: 'New Chat',
      messages: [],
      lastMessage: null,
      personality: 'assistant' // Default personality
    };
    const updatedChats = [...chats, newChat];
    setChats(updatedChats);
    setActiveChatId(newChat.id);
    const newNextNumber = nextChatNumber + 1;
    setNextChatNumber(newNextNumber);
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
          title: 'New Chat',
          messages: [],
          lastMessage: null,
          personality: 'assistant'
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
    
    const sanitizedTitle = newTitle.trim();
    
    const updatedChats = chats.map(chat => 
      chat.id === chatId 
        ? { ...chat, title: sanitizedTitle }
        : chat
    );
    
    setChats(updatedChats);
    
    // Save to localStorage
    saveUserChats(username, updatedChats, activeChatId, nextChatNumber);
  };

  const updateChatPersonality = (chatId, personality) => {
    const updatedChats = chats.map(chat => 
      chat.id === chatId 
        ? { ...chat, personality }
        : chat
    );
    
    setChats(updatedChats);
    
    // Save to localStorage
    saveUserChats(username, updatedChats, activeChatId, nextChatNumber);
    
    // Update personality on backend
    updatePersonalityOnBackend(chatId, personality);
  };

  const updatePersonalityOnBackend = async (chatId, personality) => {
    try {
      const response = await fetch('/update-personality', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user': `test-${username}`
        },
        body: JSON.stringify({
          session_id: chatId,
          personality: personality
        })
      });
      
      const data = await response.json();
      if (data.status === 'success') {
        console.log(`Personality updated to ${personality}`);
      } else {
        console.error('Failed to update personality:', data.error);
      }
    } catch (error) {
      console.error('Error updating personality:', error);
    }
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
          session_id: activeChatId,
          personality: activeChat.personality || 'assistant'
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

      // Suggest a chat title from first exchange when still "New Chat"
      if (activeChat.title === 'New Chat') {
        const firstUser = finalMessages.find(m => m.sender === 'user');
        const firstAi = finalMessages.find(m => m.sender === 'ai');
        if (firstUser && firstAi) {
          fetch('/chat/suggest-title', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_message: firstUser.text, ai_message: firstAi.text })
          })
            .then(r => r.json())
            .then((suggestData) => {
              const title = (suggestData.title || '').trim().slice(0, 200) || 'New Chat';
              setChats(prev => {
                const chat = prev.find(c => c.id === activeChatId);
                if (!chat || chat.title !== 'New Chat') return prev;
                const next = prev.map(c => c.id === activeChatId ? { ...c, title } : c);
                saveUserChats(username, next, activeChatId, nextChatNumber);
                return next;
              });
            })
            .catch(() => {});
        }
      }
      
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

  // Calculate backend index for a message (excludes error messages, accounts for system prompt)
  // Backend index is the position in conversation_history array (0 = system, 1+ = user/assistant messages)
  const getBackendIndex = (messageIndex, messages) => {
    // Count how many user/ai messages come before this message index
    let count = 0;
    
    for (let i = 0; i < messageIndex; i++) {
      // Only count user and ai messages (skip error messages and system)
      if (messages[i] && (messages[i].sender === 'user' || messages[i].sender === 'ai')) {
        count++;
      }
    }
    
    // Backend index = count + 1 (because system prompt is at index 0)
    return count + 1;
  };

  // Edit a message (truncates after it, then backend generates a new AI response)
  const editMessage = async (messageIndex, newContent) => {
    if (!activeChatId || !username) return false;
    
    const activeChat = getActiveChat();
    if (!activeChat || !activeChat.messages[messageIndex]) return false;
    
    const message = activeChat.messages[messageIndex];
    
    if (message.sender !== 'user') return false;
    
    const backendIndex = getBackendIndex(messageIndex, activeChat.messages);
    const previousMessages = activeChat.messages;
    
    // Optimistic update: show edited message and truncate immediately so the edit box is gone and message looks normal while we wait for the AI
    const updatedMessages = [...activeChat.messages];
    updatedMessages[messageIndex] = {
      ...updatedMessages[messageIndex],
      text: newContent
    };
    const truncatedMessages = updatedMessages.slice(0, messageIndex + 1);
    updateChatMessages(activeChatId, truncatedMessages);
    
    setIsLoading(true);
    try {
      const response = await fetch('/message/edit', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user': `test-${username}`
        },
        body: JSON.stringify({
          session_id: activeChatId,
          message_index: backendIndex,
          new_content: newContent,
          role: 'user'
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Same as sending a message: ask /chat for a reply (regenerate_only = no new user message)
      const chatRes = await fetch('/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user': `test-${username}`
        },
        body: JSON.stringify({
          session_id: activeChatId,
          personality: activeChat.personality || 'assistant',
          regenerate_only: true
        })
      });
      const chatData = await chatRes.json();
      if (chatData.error) throw new Error(chatData.error);
      
      const aiMessage = {
        id: Date.now() + 1,
        text: chatData.response,
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString()
      };
      updateChatMessages(activeChatId, [...truncatedMessages, aiMessage]);
      return true;
    } catch (error) {
      console.error('Error editing message:', error);
      alert(`Failed to edit message: ${error.message}`);
      updateChatMessages(activeChatId, previousMessages);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a message
  const deleteMessage = async (messageIndex) => {
    if (!activeChatId || !username) return false;
    
    const activeChat = getActiveChat();
    if (!activeChat || !activeChat.messages[messageIndex]) return false;
    
    const message = activeChat.messages[messageIndex];
    
    // Can only delete user and ai messages (not error messages)
    if (message.sender === 'error' || message.sender === 'system') {
      return false;
    }
    
    // Confirm deletion (warn that subsequent messages will also be deleted)
    if (!window.confirm('Are you sure you want to delete this message? All messages after it will also be deleted.')) {
      return false;
    }
    
    const backendIndex = getBackendIndex(messageIndex, activeChat.messages);
    
    try {
      const response = await fetch('/message/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user': `test-${username}`
        },
        body: JSON.stringify({
          session_id: activeChatId,
          message_index: backendIndex
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Remove the message and all messages after it from frontend
      const updatedMessages = activeChat.messages.slice(0, messageIndex);
      updateChatMessages(activeChatId, updatedMessages);
      return true;
    } catch (error) {
      console.error('Error deleting message:', error);
      alert(`Failed to delete message: ${error.message}`);
      return false;
    }
  };

  // Redo AI message: replace with loading in place, then swap in new response
  const redoAiMessage = async (messageIndex) => {
    if (!activeChatId || !username) return false;
    const activeChat = getActiveChat();
    if (!activeChat || !activeChat.messages[messageIndex] || activeChat.messages[messageIndex].sender !== 'ai') return false;
    const backendIndex = getBackendIndex(messageIndex, activeChat.messages);
    const previousMessage = activeChat.messages[messageIndex];
    const truncated = activeChat.messages.slice(0, messageIndex + 1);
    truncated[messageIndex] = { ...previousMessage, text: '', loading: true };
    updateChatMessages(activeChatId, truncated);
    try {
      const response = await fetch('/chat/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user': `test-${username}`
        },
        body: JSON.stringify({ session_id: activeChatId, message_index: backendIndex })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      const updated = [...truncated];
      updated[messageIndex] = {
        ...previousMessage,
        text: data.response,
        timestamp: new Date().toLocaleTimeString(),
        loading: false
      };
      updateChatMessages(activeChatId, updated);
      return true;
    } catch (error) {
      console.error('Error regenerating message:', error);
      alert(`Failed to regenerate: ${error.message}`);
      truncated[messageIndex] = previousMessage;
      updateChatMessages(activeChatId, truncated);
      return false;
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
              <h1>Chatbot</h1>
            </header>
            <main className="chat-main">
              <UsernameInput onUsernameSet={handleUsernameSet} />
            </main>
          </div>
        </div>
      </div>
    );
  }

  // Show personality picker if requested
  if (showPersonalityPicker) {
    return (
      <div className="App">
        <div className="app-container">
          <div className="main-content">
            <header className="app-header">
              <div className="header-content">
                <h1>Choose Personality</h1>
                <button onClick={() => setShowPersonalityPicker(false)} className="back-btn">
                  Back to Chat
                </button>
              </div>
            </header>
            <main className="chat-main">
              <PersonalityPicker 
                selectedPersonality={activeChat?.personality || 'assistant'}
                onPersonalityChange={(personality) => {
                  if (activeChat) {
                    updateChatPersonality(activeChat.id, personality);
                  }
                  setShowPersonalityPicker(false);
                }}
                onPersonalityCreated={fetchPersonalities}
              />
            </main>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
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
                <div className="chat-header-title">
                  <h1 title={activeChat ? activeChat.title : 'Chatbot'}>{activeChat ? activeChat.title : 'Chatbot'}</h1>
                </div>
                <div className="header-right">
                  {activeChat && (
                    <button 
                      onClick={() => setShowPersonalityPicker(true)}
                      className="personality-btn"
                    >
                      {getPersonalityIcon(activeChat.personality || 'assistant', personalities)} 
                      {getPersonalityName(activeChat.personality || 'assistant', personalities)}
                    </button>
                  )}
                  {userStatus && userStatus.limit_enabled && (
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
                  <ThemeToggle />
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
                  userStatus={userStatus}
                  onEditMessage={editMessage}
                  onDeleteMessage={deleteMessage}
                  onRedoAiMessage={redoAiMessage}
                />
              )}
            </main>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}

const getPersonalityIcon = (personalityKey, personalities) => {
  // Check if it's a custom personality first
  if (personalities[personalityKey] && personalities[personalityKey].icon) {
    return personalities[personalityKey].icon;
  }
  
  // Fallback to default icons
  const icons = {
    assistant: '🤖',
    coach: '🏋️',
    therapist: '🧠',
    study_buddy: '📚',
    bestie: '✨',
    best_friend: '👨‍💻',
    romantic_partner: '💕'
  };
  return icons[personalityKey] || '🤖';
};

const getPersonalityName = (personalityKey, personalities) => {
  // Check if it's a custom personality first
  if (personalities[personalityKey] && personalities[personalityKey].name) {
    return personalities[personalityKey].name;
  }
  
  // Fallback to default names
  const names = {
    assistant: 'Assistant',
    coach: 'Coach',
    therapist: 'Therapist',
    study_buddy: 'Study Buddy',
    bestie: 'Bestie',
    best_friend: 'Best Friend (chill)',
    romantic_partner: 'Partner'
  };
  return names[personalityKey] || 'AI';
};

export default App;
