'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useInputHistory } from '@/hooks/useInputHistory';
import { useGetMessages, useSendMessage } from '@/hooks/api';
import { useGenerateProject } from '@/hooks/api/useAi';
import { useIdeStore } from '@/store/ideStore';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { ChatPlaceholder } from './ChatPlaceholder';
import './ChatSection.css';
import { useQueryClient } from '@tanstack/react-query';

export function ChatSection() {
  const selectedProjectId = useIdeStore((state) => state.selectedProjectId);
  const setSelectedProjectId = useIdeStore(
    (state) => state.setSelectedProjectId,
  );
  const isProcessing = useIdeStore((state) => state.isProcessing);
  const setIsProcessing = useIdeStore((state) => state.setIsProcessing);
  const queryClient = useQueryClient();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useGetMessages(selectedProjectId);

  // Track if AI is processing
  const [isAIProcessing, setIsAIProcessing] = useState(false);

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
    return data?.pages.flatMap((page) => page.messages) ?? [];
  }, [data]);

  // Track AI response completion
  useEffect(() => {
    if (isAIProcessing && chatHistory.length > 0) {
      const lastMessage = chatHistory[chatHistory.length - 1];
      // If the last message is from AI (Navo), stop processing
      if (lastMessage.role === 'Navo' || lastMessage.role === 'assistant') {
        setIsAIProcessing(false);
      }
    }
  }, [chatHistory, isAIProcessing]);

  const { user } = useAuth();
  const { inputValue, setInputValue, handleKeyDown, addToHistory } =
    useInputHistory();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { mutate: sendMessage } = useSendMessage({
    onError: (error) => {
      console.error('Failed to send message:', error);
      // TODO: Show error toast to user
    },
    onSettled: () => {
      setIsProcessing(false);
    },
  });

  const { mutate: generateProject } = useGenerateProject({
    onSuccess: (data, variables) => {
      // 1. Set the new project ID in the global store
      setSelectedProjectId(data.projectId);
      // 2. Invalidate project list to refetch and show the new project in UI
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      // 3. Immediately send the initial message to the new project
      sendMessage({
        prompt: variables.projectDescription, // The original user message
        chatHistory: [], // No history for the first message
        projectId: data.projectId, // Explicitly pass the new project ID
      });
    },
    onError: (error) => {
      console.error('Failed to generate project:', error);
      // TODO: Show error toast to user
      setIsProcessing(false); // Stop processing on error
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const chatContainer = messagesEndRef.current?.parentElement;
    if (chatContainer) {
      const { scrollHeight, scrollTop, clientHeight } = chatContainer;
      if (scrollHeight - scrollTop < clientHeight + 400) {
        // Increased threshold
        scrollToBottom();
      }
    }
  }, [chatHistory]);

  const handleSendMessage = () => {
    if (!inputValue.trim() || isProcessing || isAIProcessing) return;

    const messageToSend = inputValue;
    setInputValue(''); // Clear input immediately
    setIsAIProcessing(true); // Start AI processing indicator

    if (!selectedProjectId) {
      setIsProcessing(true);
      generateProject({
        projectName: `AI Project - ${new Date().toLocaleTimeString()}`,
        projectDescription: messageToSend,
      });
    } else {
      const recentHistory = chatHistory.slice(-10);
      sendMessage({
        prompt: messageToSend,
        chatHistory: recentHistory
      }, {
        onSuccess: () => {
          // User message sent, AI response will come via polling
          console.log('User message sent, waiting for AI response...');
        },
        onError: (error) => {
          console.error('Failed to send message:', error);
          setIsAIProcessing(false);
        }
      });
    }
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
          <div
            ref={topOfChatRef}
            style={{ height: '1px', visibility: 'hidden' }}
          />
        )}
        {isLoading && (
          <div className="loading-more">대화 기록을 불러오는 중...</div>
        )}
        {isFetchingNextPage && (
          <div className="loading-more">이전 대화를 불러오는 중...</div>
        )}

        {chatHistory.length === 0 && !isLoading && !isFetchingNextPage ? (
          <ChatPlaceholder onExampleClick={setInputValue} />
        ) : (
          <>
            {chatHistory.map((message: any) => {
            const isUser = message.role === 'user';
            return (
              <div
                key={message.id}
                className={`chat-message ${isUser ? 'user' : 'ai'}`}
              >
                <div className={`message-bubble ${isUser ? 'user' : 'ai'}`}>
                  <div className="message-text">{message.content}</div>
                </div>
                <div className="message-timestamp">
                  {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                </div>
              </div>
            );
          })}

          {/* AI Processing Indicator */}
          {isAIProcessing && (
            <div className="chat-message ai">
              <div className="message-content">
                <div className="ai-thinking">
                  <div className="thinking-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span className="thinking-text">AI가 생각 중입니다...</span>
                </div>
              </div>
            </div>
          )}
        </>
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
            placeholder={
              selectedProjectId
                ? '아이디어를 입력하여 프로젝트를 발전시키세요...'
                : '아이디어를 입력하여 새 AI 프로젝트를 시작하세요...'
            }
            disabled={isProcessing || isAIProcessing}
            rows={1}
            className="chat-textarea"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isProcessing || isAIProcessing}
            className="send-button-new"
            title={isProcessing || isAIProcessing ? 'AI 에이전트 작업 중...' : '전송'}
          >
            {isProcessing || isAIProcessing ? (
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
