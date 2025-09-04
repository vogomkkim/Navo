'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useInputHistory } from '@/hooks/useInputHistory';
import { useGetMessages, useSendMessage } from '@/hooks/api';
import { useIdeStore } from '@/store/ideStore';
import { useEffect, useMemo, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import { ChatPlaceholder } from './ChatPlaceholder';
import './ChatSection.css';

export function ChatSection() {
  const { selectedProjectId, isProcessing, setIsProcessing } = useIdeStore(
    (state) => ({
      selectedProjectId: state.selectedProjectId,
      isProcessing: state.isProcessing,
      setIsProcessing: state.setIsProcessing,
    })
  );

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useGetMessages(selectedProjectId);

  // Refetch messages when project changes
  useEffect(() => {
    if (selectedProjectId) {
      refetch();
    }
  }, [selectedProjectId, refetch]);

  const { ref: topOfChatRef, inView: isTopOfChatVisible } = useInView({
    threshold: 0,
  });

  useEffect(() => {
    if (isTopOfChatVisible && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isTopOfChatVisible, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const chatHistory = useMemo(() => {
    return data?.pages.flatMap((page) => page.messages).reverse() ?? [];
  }, [data]);

  const { user } = useAuth();
  const { inputValue, setInputValue, handleKeyDown, addToHistory } =
    useInputHistory();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { mutate: sendMessage } = useSendMessage({
    onError: (error) => {
      console.error("Failed to send message:", error);
      // Here you could add a temporary error message to the UI
    },
    onSettled: () => {
      setIsProcessing(false);
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const chatContainer = messagesEndRef.current?.parentElement;
    if (chatContainer) {
      const { scrollHeight, scrollTop, clientHeight } = chatContainer;
      if (scrollHeight - scrollTop < clientHeight + 400) { // Increased threshold
        scrollToBottom();
      }
    }
  }, [chatHistory]);

  const handleSendMessage = () => {
    if (!inputValue.trim() || isProcessing) return;

    const messageToSend = inputValue;
    const recentHistory = chatHistory.slice(-10);

    addToHistory(messageToSend);
    setIsProcessing(true);

    sendMessage({ prompt: messageToSend, chatHistory: recentHistory });
    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {hasNextPage && (
          <div ref={topOfChatRef} style={{ height: '1px', visibility: 'hidden' }} />
        )}
        {isLoading && <div className="loading-more">대화 기록을 불러오는 중...</div>}
        {isFetchingNextPage && <div className="loading-more">이전 대화를 불러오는 중...</div>}
        
        {chatHistory.length === 0 && !isLoading && !isFetchingNextPage ? (
          <ChatPlaceholder onExampleClick={setInputValue} />
        ) : (
          chatHistory.map((message: any) => {
            const isUser = message.role === 'user';
            return (
              <div
                key={message.id}
                className={`chat-message ${isUser ? 'user' : 'ai'}`}
              >
                <div className="message-avatar">{isUser ? '👤' : '🤖'}</div>
                <div className={`message-bubble ${isUser ? 'user' : 'ai'}`}>
                  <div className="message-sender">
                    {isUser ? '사용자' : message.role}
                  </div>
                  <div className="message-text">{message.content}</div>
                  <div className="message-timestamp">
                    {new Date(message.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            onKeyDown={handleKeyDown}
            placeholder={selectedProjectId ? "아이디어를 입력하여 프로젝트를 발전시키세요..." : "먼저 프로젝트를 선택해주세요."}
            disabled={isProcessing || !selectedProjectId}
            rows={1}
            className="chat-textarea"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isProcessing || !selectedProjectId}
            className="send-button-new"
            title={isProcessing ? 'AI 에이전트 작업 중...' : '전송'}
          >
            {isProcessing ? (
              <div className="loading-spinner-new" />
            ) : (
              <svg
                className="send-icon-new"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2 .01 7z"
                  fill="currentColor"
                />
              </svg>
            )}
          </button>
        </div>
        <div className="input-hint-new">
          Navo AI가 아이디어를 현실로 만듭니다.
        </div>
      </div>
    </div>
  );
}