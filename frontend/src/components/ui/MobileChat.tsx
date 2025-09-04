'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';

import { geminiClient } from '@/lib/gemini';

export function MobileChat() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<
    Array<{
      id: string;
      type: 'user' | 'ai';
      message: string;
      timestamp: Date;
    }>
  >([
    {
      id: 'welcome',
      type: 'ai',
      message:
        '안녕하세요! 모바일에서도 AI와 대화할 수 있습니다. 무엇을 도와드릴까요?',
      timestamp: new Date(),
    },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const chatDrawerRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const chatHistoryRef = useRef<HTMLDivElement>(null);

  const toggleChat = () => {
    setIsOpen((prev) => !prev);
  };

  const closeChat = () => {
    setIsOpen(false);
  };

  const handleSendChat = async () => {
    if (chatInput.trim() && !isProcessing) {
      const userMessage = {
        id: Date.now().toString(),
        type: 'user' as const,
        message: chatInput,
        timestamp: new Date(),
      };

      setChatHistory((prev) => [...prev, userMessage]);
      setChatInput('');
      setIsProcessing(true);

      try {
        // AI 응답 생성 (실제 API 연동)
        const aiResponse = {
          id: (Date.now() + 1).toString(),
          type: 'ai' as const,
          message: `"${chatInput}"에 대한 답변을 생성 중입니다...`,
          timestamp: new Date(),
        };

        setChatHistory((prev) => [...prev, aiResponse]);

        // 실제 AI API 호출 (간단한 시뮬레이션)
        setTimeout(() => {
          setChatHistory((prev) =>
            prev.map((msg) =>
              msg.id === aiResponse.id
                ? {
                    ...msg,
                    message: `"${chatInput}"에 대한 AI 답변입니다. 더 자세한 정보가 필요하시면 말씀해 주세요.`,
                  }
                : msg,
            ),
          );
          setIsProcessing(false);
        }, 2000);
      } catch (error) {
        console.error('AI chat error:', error);
        setIsProcessing(false);
      }
    }
  };

  // 채팅 히스토리 자동 스크롤
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // 로컬 저장된 히스토리 불러오기 (사용자별)
  useEffect(() => {
    try {
      const storageKey = user?.id
        ? `navo_mobile_chat_history_${user.id}`
        : 'navo_mobile_chat_history_guest';
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Array<{
          id: string;
          type: 'user' | 'ai';
          message: string;
          timestamp: string;
        }>;
        const revived = parsed.map((m) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
        setChatHistory(revived);
      }
    } catch (e) {
      console.warn('Failed to load mobile chat history from localStorage', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // 히스토리 저장 (사용자별)
  useEffect(() => {
    try {
      const storageKey = user?.id
        ? `navo_mobile_chat_history_${user.id}`
        : 'navo_mobile_chat_history_guest';
      const serializable = chatHistory.map((m) => ({
        ...m,
        timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
      }));
      localStorage.setItem(storageKey, JSON.stringify(serializable));
    } catch (e) {
      console.warn('Failed to save mobile chat history to localStorage', e);
    }
  }, [chatHistory, user?.id]);

  // Mobile chat resize logic
  useEffect(() => {
    const chatDrawer = chatDrawerRef.current;
    const dragHandle = dragHandleRef.current;

    if (!chatDrawer || !dragHandle) return;

    let startY = 0;
    let startHeight = 0;

    const onTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
      startHeight = chatDrawer.offsetHeight;
      chatDrawer.style.transition = 'none';
    };

    const onTouchMove = (e: TouchEvent) => {
      const deltaY = startY - e.touches[0].clientY;
      const newHeight = Math.max(startHeight + deltaY, 200); // 최소 높이 증가
      const maxHeight = window.innerHeight * 0.8; // 최대 높이 제한
      chatDrawer.style.height = `${Math.min(newHeight, maxHeight)}px`;
    };

    const onTouchEnd = () => {
      chatDrawer.style.transition = '';
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
          <h3>AI 채팅</h3>
          <button
            id="closeMobileChatBtn"
            className="close-btn"
            aria-label="Close chat"
            onClick={closeChat}
          >
            ×
          </button>
        </div>
        <div
          className="chat-history"
          id="chatHistoryMobile"
          ref={chatHistoryRef}
        >
          {chatHistory.map((message) => (
            <div
              key={message.id}
              className={`chat-message ${message.type === 'user' ? 'user' : 'ai'}`}
            >
              <div className="message-content">
                <p>{message.message}</p>
                <span className="message-time">
                  {message.timestamp.toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="chat-message ai">
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
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
          placeholder="AI와 대화해보세요..."
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSendChat();
            }
          }}
          disabled={isProcessing}
        />
        <button
          id="chatSendBtnMobile"
          onClick={handleSendChat}
          disabled={isProcessing || !chatInput.trim()}
        >
          {isProcessing ? '전송 중...' : '전송'}
        </button>
      </div>
    </>
  );
}
