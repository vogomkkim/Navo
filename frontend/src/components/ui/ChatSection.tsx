'use client';

import { useState } from 'react';

export function ChatSection() {
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<string[]>([]);

  const handleSendChat = () => {
    if (chatInput.trim()) {
      setChatHistory((prev) => [...prev, chatInput]);
      setChatInput('');
      // TODO: Integrate with AI command API
    }
  };

  return (
    <div className="panel-section chat-section">
      <h2>Chat</h2>
      <div className="chat-history" id="chatHistory">
        {chatHistory.map((message, index) => (
          <p key={index}>{message}</p>
        ))}
      </div>
      <div className="chat-input-area">
        <input
          type="text"
          id="chatInput"
          placeholder="e.g., Make the title blue"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSendChat();
            }
          }}
        />
        <button id="chatSendBtn" onClick={handleSendChat}>Send</button>
      </div>
    </div>
  );
}