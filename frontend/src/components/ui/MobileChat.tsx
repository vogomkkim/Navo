'use client';

import { useState, useRef, useEffect } from 'react';

export function MobileChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<string[]>([]);
  const chatDrawerRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);

  const toggleChat = () => {
    setIsOpen((prev) => !prev);
  };

  const closeChat = () => {
    setIsOpen(false);
  };

  const handleSendChat = () => {
    if (chatInput.trim()) {
      setChatHistory((prev) => [...prev, chatInput]);
      setChatInput('');
      // TODO: Integrate with AI command API
    }
  };

  // Mobile chat resize logic (simplified for now, full implementation would be more complex)
  useEffect(() => {
    const chatDrawer = chatDrawerRef.current;
    const dragHandle = dragHandleRef.current;

    if (!chatDrawer || !dragHandle) return;

    let startY = 0;
    let startHeight = 0;

    const onTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
      startHeight = chatDrawer.offsetHeight;
      chatDrawer.style.transition = 'none'; // Disable transition during drag
    };

    const onTouchMove = (e: TouchEvent) => {
      const deltaY = startY - e.touches[0].clientY;
      const newHeight = Math.max(startHeight + deltaY, 100); // Minimum height
      chatDrawer.style.height = `${newHeight}px`;
    };

    const onTouchEnd = () => {
      chatDrawer.style.transition = ''; // Re-enable transition
    };

    dragHandle.addEventListener('touchstart', onTouchStart);
    dragHandle.addEventListener('touchmove', onTouchMove);
    dragHandle.addEventListener('touchend', onTouchEnd);

    return () => {
      dragHandle.removeEventListener('touchstart', onTouchStart);
      dragHandle.removeEventListener('touchmove', onTouchMove);
      dragHandle.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  return (
    <>
      {isOpen && (
        <div
          className="mobile-chat-overlay active"
          id="mobileChatOverlay"
          onClick={closeChat}
        ></div>
      )}
      <div
        className={`mobile-chat-drawer ${isOpen ? 'open' : ''}`}
        id="mobileChatDrawer"
        aria-hidden={!isOpen}
        ref={chatDrawerRef}
      >
        <div className="mobile-chat-drawer-header">
          <div
            className="drag-handle"
            id="mobileChatDragHandle"
            aria-hidden="true"
            ref={dragHandleRef}
          ></div>
          <h3>Chat</h3>
          <button
            id="closeMobileChatBtn"
            className="close-btn"
            aria-label="Close chat"
            onClick={closeChat}
          >
            ×
          </button>
        </div>
        <div className="chat-history" id="chatHistoryMobile">
          {chatHistory.map((message, index) => (
            <p key={index}>{message}</p>
          ))}
        </div>
      </div>
      <div className="mobile-chat-bar" id="mobileChatBar">
        <button
          id="chatToggleBtn"
          className="chat-toggle-btn"
          aria-controls="mobileChatDrawer"
          aria-expanded={isOpen}
          onClick={toggleChat}
        >
          💬
        </button>
        <input
          type="text"
          id="chatInputMobile"
          placeholder="Message…"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSendChat();
            }
          }}
        />
        <button id="chatSendBtnMobile" onClick={handleSendChat}>
          Send
        </button>
      </div>
    </>
  );
}
