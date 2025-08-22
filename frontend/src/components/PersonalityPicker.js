import React, { useState, useEffect } from 'react';
import './PersonalityPicker.css';

const PersonalityPicker = ({ selectedPersonality, onPersonalityChange }) => {
  const [personalities, setPersonalities] = useState({});
  const [isLoading, setIsLoading] = useState(true);

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
      </div>
      
      <div className="personality-grid">
        {Object.entries(personalities).map(([key, personality]) => (
          <div
            key={key}
            className={`personality-card ${selectedPersonality === key ? 'selected' : ''}`}
            onClick={() => handlePersonalitySelect(key)}
          >
            <div className="personality-icon">
              {getPersonalityIcon(key)}
            </div>
            <div className="personality-info">
              <h4>{personality.name}</h4>
              <p>{personality.description}</p>
            </div>
            {selectedPersonality === key && (
              <div className="selected-indicator">✓</div>
            )}
          </div>
        ))}
      </div>
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
