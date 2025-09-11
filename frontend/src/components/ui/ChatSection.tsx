'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useInputHistory } from '@/hooks/useInputHistory';
import { useGetMessages, useSendMessage } from '@/hooks/api';
import { useGenerateProject } from '@/hooks/api/useAi';
import { useIdeStore } from '@/store/ideStore';
import { useEffect, useMemo, useRef, useState, UIEvent } from 'react';
import { useInView } from 'react-intersection-observer';
import { ChatPlaceholder } from './ChatPlaceholder';
import './ChatSection.css';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDownIcon, Cross2Icon } from '@radix-ui/react-icons';

export function ChatSection() {
  const selectedProjectId = useIdeStore((state) => state.selectedProjectId);
  const setSelectedProjectId = useIdeStore(
    (state) => state.setSelectedProjectId
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

  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    content: string;
    id: number;
  } | null>(null);

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
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { mutate: sendMessage } = useSendMessage({
    onError: (error) => console.error('Failed to send message:', error),
    onSettled: () => setIsProcessing(false),
  });

  const { mutate: generateProject } = useGenerateProject({
    onSuccess: (data, variables) => {
      setSelectedProjectId(data.projectId);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      sendMessage({
        prompt: variables.projectDescription,
        chatHistory: [],
        projectId: data.projectId,
      });
    },
    onError: (error) => {
      console.error('Failed to generate project:', error);
      setIsProcessing(false);
    },
  });

  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // --- Intelligent Scroll Logic ---

  // 1. On user send, always scroll to bottom
  useEffect(() => {
    if (isAIProcessing) {
      scrollToBottom('auto');
    }
  }, [isAIProcessing]);

  // 2. On new message from AI, show toast or scroll
  useEffect(() => {
    if (chatHistory.length > 0) {
      const lastMessage = chatHistory[chatHistory.length - 1];
      if (lastMessage.role !== 'user') {
        // Message from AI
        const chatContainer = chatContainerRef.current;
        if (chatContainer) {
          const { scrollHeight, scrollTop, clientHeight } = chatContainer;
          const isAtBottom = scrollHeight - scrollTop < clientHeight + 200;

          if (isAtBottom) {
            scrollToBottom();
          } else {
            setToastMessage({
              content: lastMessage.content,
              id: Date.now(),
            });
            const timer = setTimeout(() => setToastMessage(null), 3000);
            return () => clearTimeout(timer);
          }
        }
      }
    }
  }, [chatHistory]);

  // 3. On scroll, manage the "Scroll to Bottom" button visibility
  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isScrolledUp = scrollHeight - scrollTop > clientHeight + 300;
    setShowScrollToBottom(isScrolledUp);
  };

  const handleSendMessage = () => {
    if (!inputValue.trim() || isProcessing || isAIProcessing) return;
    const messageToSend = inputValue;
    addToHistory(messageToSend);
    setInputValue('');
    setIsAIProcessing(true);

    if (!selectedProjectId) {
      setIsProcessing(true);
      generateProject({
        projectName: `AI Project - ${new Date().toLocaleTimeString()}`,
        projectDescription: messageToSend,
      });
    } else {
      const recentHistory = chatHistory
        .slice(-10)
        .map((m) => ({ role: m.role, message: m.content }));
      sendMessage({ prompt: messageToSend, chatHistory: recentHistory });
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
      <div
        className="chat-messages"
        ref={chatContainerRef}
        onScroll={handleScroll}
      >
        {/* ... (message rendering logic remains the same) ... */}
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
            </div>
          );
        })}
        {isAIProcessing && (
          <div className="chat-message ai">
            <div className="message-bubble ai">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* --- Overlays --- */}
      <div className="chat-overlays">
        {toastMessage && (
          <div className="toast-new-message" onClick={() => scrollToBottom()}>
            <div className="toast-content">
              {toastMessage.content.substring(0, 80)}...
            </div>
            <button
              className="toast-close-btn"
              onClick={(e) => {
                e.stopPropagation();
                setToastMessage(null);
              }}
            >
              <Cross2Icon className="h-4 w-4" />
            </button>
          </div>
        )}
        {showScrollToBottom && !toastMessage && (
          <button
            className="scroll-to-bottom-btn"
            onClick={() => scrollToBottom()}
          >
            <ChevronDownIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="chat-input-area">
        {/* ... (input area JSX remains the same) ... */}
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          onKeyDown={handleKeyDown}
          placeholder="Ask AI to build..."
          disabled={isProcessing || isAIProcessing}
          rows={1}
          className="chat-textarea"
        />
        <button
          onClick={handleSendMessage}
          disabled={!inputValue.trim() || isProcessing || isAIProcessing}
          className="send-button-new"
        >
          {/* ... */}
        </button>
      </div>
    </div>
  );
}
