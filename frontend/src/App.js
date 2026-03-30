import React, { useState, useEffect } from 'react';
import './App.css';
import ChatInterface from './components/ChatInterface';
import ChatSidebar from './components/ChatSidebar';
import UsernameInput from './components/UsernameInput';
import PersonalityPicker from './components/PersonalityPicker';
import ThemeToggle from './components/ThemeToggle';
import { useConfirm } from './ConfirmDialogContext';

const userHeaders = (username) => ({
  'Content-Type': 'application/json',
  'x-user': `test-${username}`,
});

function normalizeMessagesFromApi(messages) {
  if (!messages || !messages.length) return [];
  return messages.map((m) => ({
    id: m.id,
    text: m.text,
    sender: m.sender,
    timestamp: m.timestamp
      ? new Date(m.timestamp).toLocaleTimeString()
      : new Date().toLocaleTimeString(),
  }));
}

function App() {
  const confirm = useConfirm();
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [username, setUsername] = useState(null);
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

  const activeChatStorageKey = (u) => `chatbot_active_${u}`;

  const persistActiveChatId = (u, chatId) => {
    if (u && chatId) localStorage.setItem(activeChatStorageKey(u), chatId);
  };

  // Load user's chats from API (PostgreSQL via backend)
  const loadUserChats = async (u) => {
    try {
      const res = await fetch(
        `/api/users/${encodeURIComponent(u)}/chats`,
        { headers: userHeaders(u) }
      );
      if (!res.ok) throw new Error('Failed to load chats');
      const data = await res.json();
      let list = data.chats || [];

      if (list.length === 0) {
        const initialChat = {
          id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: 'New Chat',
          messages: [],
          lastMessage: null,
          personality: 'assistant',
        };
        const createRes = await fetch(
          `/api/users/${encodeURIComponent(u)}/chats`,
          {
            method: 'POST',
            headers: userHeaders(u),
            body: JSON.stringify({
              id: initialChat.id,
              title: initialChat.title,
              personality: initialChat.personality,
            }),
          }
        );
        if (!createRes.ok) throw new Error('Failed to create initial chat');
        list = [
          {
            id: initialChat.id,
            title: initialChat.title,
            personality: initialChat.personality,
            lastMessage: null,
            messageCount: 0,
          },
        ];
      }

      let chatsState = list.map((c) => ({
        id: c.id,
        title: c.title,
        personality: c.personality || 'assistant',
        messages: [],
        lastMessage: c.lastMessage,
      }));

      let activeId = localStorage.getItem(activeChatStorageKey(u));
      if (!activeId || !chatsState.some((c) => c.id === activeId)) {
        activeId = chatsState[0].id;
      }

      const msgRes = await fetch(`/api/chats/${encodeURIComponent(activeId)}/messages`, {
        headers: userHeaders(u),
      });
      if (msgRes.ok) {
        const msgData = await msgRes.json();
        const normalized = normalizeMessagesFromApi(msgData.messages);
        chatsState = chatsState.map((c) =>
          c.id === activeId ? { ...c, messages: normalized } : c
        );
      }

      setChats(chatsState);
      setActiveChatId(activeId);
      persistActiveChatId(u, activeId);
    } catch (e) {
      console.error('Error loading chats:', e);
      const initialChat = {
        id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: 'New Chat',
        messages: [],
        lastMessage: null,
        personality: 'assistant',
      };
      setChats([initialChat]);
      setActiveChatId(initialChat.id);
    } finally {
      setIsInitialized(true);
    }
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
    }
  }, [username, showLogin]);

  const handleLogout = () => {
    if (username) localStorage.removeItem(activeChatStorageKey(username));
    localStorage.removeItem('chatbot_username');
    setUsername(null);
    setChats([]);
    setActiveChatId(null);
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

  const createNewChat = async () => {
    const activeChat = chats.find((c) => c.id === activeChatId);
    if (activeChat && (!activeChat.messages || activeChat.messages.length === 0)) {
      return;
    }
    const existingEmptyChat = chats.find((c) => !c.messages || c.messages.length === 0);
    if (existingEmptyChat) {
      setActiveChatId(existingEmptyChat.id);
      persistActiveChatId(username, existingEmptyChat.id);
      const msgRes = await fetch(
        `/api/chats/${encodeURIComponent(existingEmptyChat.id)}/messages`,
        { headers: userHeaders(username) }
      );
      if (msgRes.ok) {
        const msgData = await msgRes.json();
        const normalized = normalizeMessagesFromApi(msgData.messages);
        setChats((prev) =>
          prev.map((c) =>
            c.id === existingEmptyChat.id ? { ...c, messages: normalized } : c
          )
        );
      }
      return;
    }
    const newChat = {
      id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: 'New Chat',
      messages: [],
      lastMessage: null,
      personality: 'assistant',
    };
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(username)}/chats`, {
        method: 'POST',
        headers: userHeaders(username),
        body: JSON.stringify({
          id: newChat.id,
          title: newChat.title,
          personality: newChat.personality,
        }),
      });
      if (!res.ok) throw new Error('Failed to create chat');
    } catch (e) {
      console.error(e);
    }
    const updatedChats = [...chats, newChat];
    setChats(updatedChats);
    setActiveChatId(newChat.id);
    persistActiveChatId(username, newChat.id);
  };

  const selectChat = async (chatId) => {
    setActiveChatId(chatId);
    persistActiveChatId(username, chatId);
    try {
      const msgRes = await fetch(`/api/chats/${encodeURIComponent(chatId)}/messages`, {
        headers: userHeaders(username),
      });
      if (!msgRes.ok) return;
      const msgData = await msgRes.json();
      const normalized = normalizeMessagesFromApi(msgData.messages);
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, messages: normalized } : c))
      );
    } catch (e) {
      console.error('Error loading messages:', e);
    }
  };

  const deleteChat = async (chatId) => {
    try {
      await fetch(`/api/chats/${encodeURIComponent(chatId)}`, {
        method: 'DELETE',
        headers: userHeaders(username),
      });
    } catch (e) {
      console.error(e);
    }

    const filteredChats = chats.filter((chat) => chat.id !== chatId);
    let newActiveChatId = activeChatId;

    if (chatId === activeChatId) {
      if (filteredChats.length > 0) {
        newActiveChatId = filteredChats[0].id;
      } else {
        const newChat = {
          id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: 'New Chat',
          messages: [],
          lastMessage: null,
          personality: 'assistant',
        };
        try {
          await fetch(`/api/users/${encodeURIComponent(username)}/chats`, {
            method: 'POST',
            headers: userHeaders(username),
            body: JSON.stringify({
              id: newChat.id,
              title: newChat.title,
              personality: newChat.personality,
            }),
          });
        } catch (e) {
          console.error(e);
        }
        filteredChats.push(newChat);
        newActiveChatId = newChat.id;
      }
    }

    setChats(filteredChats);
    setActiveChatId(newActiveChatId);
    persistActiveChatId(username, newActiveChatId);

    if (newActiveChatId) {
      try {
        const msgRes = await fetch(
          `/api/chats/${encodeURIComponent(newActiveChatId)}/messages`,
          { headers: userHeaders(username) }
        );
        if (msgRes.ok) {
          const msgData = await msgRes.json();
          const normalized = normalizeMessagesFromApi(msgData.messages);
          setChats((prev) =>
            prev.map((c) =>
              c.id === newActiveChatId ? { ...c, messages: normalized } : c
            )
          );
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const renameChat = async (chatId, newTitle) => {
    if (!newTitle || newTitle.trim().length === 0) {
      return;
    }
    const sanitizedTitle = newTitle.trim();
    try {
      const res = await fetch(`/api/chats/${encodeURIComponent(chatId)}`, {
        method: 'PATCH',
        headers: userHeaders(username),
        body: JSON.stringify({ title: sanitizedTitle }),
      });
      if (!res.ok) throw new Error('Rename failed');
    } catch (e) {
      console.error(e);
    }
    const updatedChats = chats.map((chat) =>
      chat.id === chatId ? { ...chat, title: sanitizedTitle } : chat
    );
    setChats(updatedChats);
  };

  const updateChatPersonality = (chatId, personality) => {
    const updatedChats = chats.map((chat) =>
      chat.id === chatId ? { ...chat, personality } : chat
    );
    setChats(updatedChats);
    updatePersonalityOnBackend(chatId, personality);
  };

  const updatePersonalityOnBackend = async (chatId, personality) => {
    try {
      const response = await fetch(`/api/chats/${encodeURIComponent(chatId)}`, {
        method: 'PATCH',
        headers: userHeaders(username),
        body: JSON.stringify({ personality }),
      });
      const data = await response.json();
      if (!response.ok) {
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
    const updatedChats = chats.map((chat) =>
      chat.id === chatId
        ? {
            ...chat,
            messages,
            lastMessage:
              messages.length > 0 ? messages[messages.length - 1].text : null,
          }
        : chat
    );
    setChats(updatedChats);
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
              setChats((prev) => {
                const chat = prev.find((c) => c.id === activeChatId);
                if (!chat || chat.title !== 'New Chat') return prev;
                return prev.map((c) =>
                  c.id === activeChatId ? { ...c, title } : c
                );
              });
              fetch(`/api/chats/${encodeURIComponent(activeChatId)}`, {
                method: 'PATCH',
                headers: userHeaders(username),
                body: JSON.stringify({ title }),
              }).catch(() => {});
            })
            .catch(() => {});
        }
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
    
    const ok = await confirm({
      title: 'Delete message?',
      message: 'Are you sure you want to delete this message? All messages after it will also be deleted.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      danger: true,
    });
    if (!ok) return false;
    
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
                <div className="header-right">
                  <button
                    type="button"
                    onClick={() => setShowPersonalityPicker(false)}
                    className="back-btn back-btn--prominent"
                  >
                    ← Back to Chat
                  </button>
                </div>
              </div>
            </header>
            <main className="chat-main chat-main--personality">
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
                onEditMessage={editMessage}
                onDeleteMessage={deleteMessage}
                onRedoAiMessage={redoAiMessage}
              />
            )}
          </main>
        </div>
      </div>
    </div>
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
  return names[personalityKey] || 'Assistant';
};

export default App;
