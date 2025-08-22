import React, { useState, useEffect } from 'react';
import './App.css';
import ChatInterface from './components/ChatInterface';
import ChatSidebar from './components/ChatSidebar';

function App() {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize with one chat if no chats exist
  useEffect(() => {
    if (!isInitialized) {
      const initialChat = {
        id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: 'Chat 1',
        messages: [],
        lastMessage: null
      };
      
      setChats([initialChat]);
      setActiveChatId(initialChat.id);
      setIsInitialized(true);
    }
  }, [isInitialized]);

  const createNewChat = () => {
    const newChatNumber = chats.length + 1;
    const newChat = {
      id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: `Chat ${newChatNumber}`,
      messages: [],
      lastMessage: null
    };
    
    setChats(prev => [...prev, newChat]);
    setActiveChatId(newChat.id);
  };

  const selectChat = (chatId) => {
    setActiveChatId(chatId);
  };

  const deleteChat = (chatId) => {
    setChats(prev => {
      const filteredChats = prev.filter(chat => chat.id !== chatId);
      
      // If we're deleting the active chat, switch to another chat
      if (chatId === activeChatId) {
        if (filteredChats.length > 0) {
          setActiveChatId(filteredChats[0].id);
        } else {
          // If no chats left, create a new one
          const newChat = {
            id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: 'Chat 1',
            messages: [],
            lastMessage: null
          };
          setActiveChatId(newChat.id);
          return [newChat];
        }
      }
      
      return filteredChats;
    });
  };

  const getActiveChat = () => {
    return chats.find(chat => chat.id === activeChatId);
  };

  const updateChatMessages = (chatId, messages) => {
    setChats(prev => prev.map(chat => 
      chat.id === chatId 
        ? { ...chat, messages, lastMessage: messages.length > 0 ? messages[messages.length - 1].text : null }
        : chat
    ));
  };

  const sendMessage = async (message) => {
    if (!activeChatId) return;

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
        },
        body: JSON.stringify({ 
          message: message,
          session_id: activeChatId
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

  return (
    <div className="App">
      <div className="app-container">
        <ChatSidebar 
          chats={chats}
          activeChatId={activeChatId}
          onChatSelect={selectChat}
          onNewChat={createNewChat}
          onDeleteChat={deleteChat}
        />
        <div className="main-content">
          <header className="app-header">
            <h1>ChatGPT Clone</h1>
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
