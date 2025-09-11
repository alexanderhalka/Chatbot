import React, { useState, useEffect } from 'react';
import './PersonalityPicker.css';

const PersonalityPicker = ({ selectedPersonality, onPersonalityChange, onPersonalityCreated }) => {
  const [personalities, setPersonalities] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [customPersonality, setCustomPersonality] = useState({
    name: '',
    icon: '',
    description: '',
    systemPrompt: ''
  });
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [editingPersonality, setEditingPersonality] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  useEffect(() => {
    fetchPersonalities();
  }, []);

  const fetchPersonalities = async () => {
    try {
      const response = await fetch('/personalities');
      const data = await response.json();
      setPersonalities(data.personalities);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching personalities:', error);
      setIsLoading(false);
    }
  };

  const handlePersonalitySelect = (personalityKey) => {
    onPersonalityChange(personalityKey);
  };

  const availableIcons = [
    '🤖', '👨‍💻', '👩‍💻', '🧠', '💡', '🎯', '⚡', '🔥', '💪', '🌟',
    '🎭', '🎨', '🎵', '📚', '🔬', '🏆', '💎', '🌈', '🦄', '🐱',
    '🐶', '🦊', '🐼', '🦁', '🐸', '🦋', '🌸', '🌺', '🌻', '🌹',
    '💕', '💖', '💝', '🎁', '🎉', '🎊', '✨', '⭐', '🌙', '☀️',
    '🌍', '🌎', '🌏', '🗺️', '🏔️', '🌊', '🔥', '❄️', '☁️', '🌈',
    '🎪', '🎨', '🎭', '🎬', '🎮', '🎯', '🎲', '🃏', '🎴', '🀄',
    '🍕', '🍔', '🍰', '🍭', '🍪', '☕', '🍵', '🥤', '🍷', '🍺',
    '🚀', '✈️', '🚗', '🚲', '🏍️', '🚁', '🚢', '🚂', '🚇', '🚀'
  ];

  const handleCreatePersonality = async () => {
    if (isFormValid()) {
      try {
        const isEditing = editingPersonality !== null;
        const url = isEditing ? `/personalities/${editingPersonality}` : '/personalities';
        const method = isEditing ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: customPersonality.name,
            description: customPersonality.description,
            systemPrompt: customPersonality.systemPrompt,
            icon: customPersonality.icon
          })
        });

        if (response.ok) {
          const result = await response.json();
          
          if (isEditing) {
            // Update existing personality
            setPersonalities(prev => ({
              ...prev,
              [editingPersonality]: result.personality
            }));
          } else {
            // Add new personality
            setPersonalities(prev => ({
              ...prev,
              [result.personality_key]: result.personality
            }));
          }
          
          // Notify parent component to refresh personalities
          if (onPersonalityCreated) {
            onPersonalityCreated();
          }
          
          // Reset form
          setCustomPersonality({
            name: '',
            icon: '',
            description: '',
            systemPrompt: ''
          });
          setShowCreateForm(false);
          setShowIconPicker(false);
          setEditingPersonality(null);
        } else {
          const error = await response.json();
          console.error(`Error ${isEditing ? 'updating' : 'creating'} personality:`, error);
          alert(`Failed to ${isEditing ? 'update' : 'create'} personality. Please try again.`);
        }
      } catch (error) {
        console.error(`Error ${editingPersonality ? 'updating' : 'creating'} personality:`, error);
        alert(`Failed to ${editingPersonality ? 'update' : 'create'} personality. Please try again.`);
      }
    }
  };

  const handleCancelCreate = () => {
    setCustomPersonality({
      name: '',
      icon: '',
      description: '',
      systemPrompt: ''
    });
    setShowCreateForm(false);
    setShowIconPicker(false);
    setEditingPersonality(null);
  };

  const isFormValid = () => {
    return customPersonality.name.trim() && 
           customPersonality.icon && 
           customPersonality.description.trim() && 
           customPersonality.systemPrompt.trim();
  };

  // Separate default and custom personalities
  const getDefaultPersonalities = () => {
    const defaultKeys = ['assistant', 'coach', 'therapist', 'study_buddy', 'bestie', 'best_friend', 'romantic_partner'];
    return Object.entries(personalities).filter(([key]) => defaultKeys.includes(key));
  };

  const getCustomPersonalities = () => {
    const defaultKeys = ['assistant', 'coach', 'therapist', 'study_buddy', 'bestie', 'best_friend', 'romantic_partner'];
    return Object.entries(personalities).filter(([key]) => !defaultKeys.includes(key));
  };

  const handleEditPersonality = (personalityKey, personality) => {
    setEditingPersonality(personalityKey);
    setCustomPersonality({
      name: personality.name,
      icon: personality.icon,
      description: personality.description,
      systemPrompt: personality.system_prompt
    });
    setShowCreateForm(true);
    setOpenMenuId(null);
  };

  const handleDeletePersonality = async (personalityKey) => {
    if (window.confirm('Are you sure you want to delete this custom personality?')) {
      try {
        const response = await fetch(`/personalities/${personalityKey}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          // Remove from local state
          setPersonalities(prev => {
            const newPersonalities = { ...prev };
            delete newPersonalities[personalityKey];
            return newPersonalities;
          });
          
          // If the deleted personality was selected, switch to default assistant
          if (selectedPersonality === personalityKey) {
            onPersonalityChange('assistant');
          }
          
          // Notify parent component to refresh
          if (onPersonalityCreated) {
            onPersonalityCreated();
          }
        } else {
          alert('Failed to delete personality. Please try again.');
        }
      } catch (error) {
        console.error('Error deleting personality:', error);
        alert('Failed to delete personality. Please try again.');
      }
    }
    setOpenMenuId(null);
  };

  const handleMenuClick = (e, personalityKey) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === personalityKey ? null : personalityKey);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="personality-picker">
        <div className="picker-header">
          <h3>Choose AI Personality</h3>
        </div>
        <div className="loading">Loading personalities...</div>
      </div>
    );
  }

  return (
    <div className="personality-picker">
      <div className="picker-header">
        <h3>Choose AI Personality</h3>
        <p>Select how your AI companion should behave</p>
        {!showCreateForm && (
          <button 
            className="create-personality-btn"
            onClick={() => setShowCreateForm(true)}
          >
            + Create Custom Personality
          </button>
        )}
      </div>
      
      {showCreateForm ? (
        <div className="create-form">
          <div className="form-header">
            <h4>{editingPersonality ? 'Edit Custom Personality' : 'Create Custom Personality'}</h4>
            <button className="close-btn" onClick={handleCancelCreate}>×</button>
          </div>
          
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={customPersonality.name}
              onChange={(e) => setCustomPersonality(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter personality name"
            />
          </div>

          <div className="form-group">
            <label>Icon</label>
            <div className="icon-selector">
              <button 
                className="icon-preview"
                onClick={() => setShowIconPicker(!showIconPicker)}
              >
                {customPersonality.icon || 'Select Icon'}
              </button>
              {showIconPicker && (
                <div className="icon-picker">
                  <div className="icon-grid">
                    {availableIcons.map((icon, index) => (
                      <button
                        key={index}
                        className={`icon-option ${customPersonality.icon === icon ? 'selected' : ''}`}
                        onClick={() => {
                          setCustomPersonality(prev => ({ ...prev, icon }));
                          setShowIconPicker(false);
                        }}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <input
              type="text"
              value={customPersonality.description}
              onChange={(e) => setCustomPersonality(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of this personality"
            />
          </div>

          <div className="form-group">
            <label>System Prompt</label>
            <textarea
              value={customPersonality.systemPrompt}
              onChange={(e) => setCustomPersonality(prev => ({ ...prev, systemPrompt: e.target.value }))}
              placeholder="Define how this AI should behave, respond, and interact..."
              rows={4}
            />
          </div>

          <div className="form-actions">
            <button 
              className="cancel-btn"
              onClick={handleCancelCreate}
            >
              Cancel
            </button>
            <button 
              className={`create-btn ${!isFormValid() ? 'disabled' : ''}`}
              onClick={handleCreatePersonality}
              disabled={!isFormValid()}
            >
              {editingPersonality ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      ) : (
        <div className="personality-sections">
          {/* Default Personalities Section */}
          <div className="personality-section">
            <h3 className="section-title">Default Personalities</h3>
            <div className="personality-grid">
              {getDefaultPersonalities().map(([key, personality]) => (
                <div
                  key={key}
                  className={`personality-card ${selectedPersonality === key ? 'selected' : ''}`}
                  onClick={() => handlePersonalitySelect(key)}
                >
                  <div className="personality-icon">
                    {personality.icon || getPersonalityIcon(key)}
                  </div>
                   <div className="personality-info">
                     <h4>{personality.name}</h4>
                     <p>{personality.description}</p>
                   </div>
                 </div>
              ))}
            </div>
          </div>

          {/* Custom Personalities Section */}
          <div className="personality-section">
            <h3 className="section-title">Custom Personalities</h3>
            <div className="personality-grid">
              {getCustomPersonalities().map(([key, personality]) => (
                <div
                  key={key}
                  className={`personality-card ${selectedPersonality === key ? 'selected' : ''}`}
                  onClick={() => handlePersonalitySelect(key)}
                >
                  <div className="personality-icon">
                    {personality.icon || getPersonalityIcon(key)}
                  </div>
                  <div className="personality-info">
                    <h4>{personality.name}</h4>
                    <p>{personality.description}</p>
                  </div>
                  
                  {/* 3-dot menu for custom personalities */}
                  <div className={`personality-menu ${openMenuId === key ? 'open' : ''}`}>
                    <button 
                      className="menu-btn"
                      onClick={(e) => handleMenuClick(e, key)}
                    >
                      ⋯
                    </button>
                     {openMenuId === key && (
                       <div className="menu-dropdown">
                         <button 
                           className="menu-item"
                           onClick={(e) => {
                             e.stopPropagation();
                             handleEditPersonality(key, personality);
                           }}
                         >
                           Edit
                         </button>
                         <button 
                           className="menu-item delete"
                           onClick={(e) => {
                             e.stopPropagation();
                             handleDeletePersonality(key);
                           }}
                         >
                           Delete
                         </button>
                       </div>
                     )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const getPersonalityIcon = (personalityKey) => {
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

export default PersonalityPicker;
