'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useInputHistory } from '@/hooks/useInputHistory';
import { useGetMessages, useSendMessage } from '@/hooks/api';
import { useGenerateProject } from '@/hooks/api/useAi';
import { useIdeStore } from '@/store/ideStore';
import { useEffect, useMemo, useRef, useState, UIEvent } from 'react';
import { useInView } from 'react-intersection-observer';
import './ChatSection.css';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDownIcon, Cross2Icon } from '@radix-ui/react-icons';
import { PlanConfirmation } from './PlanConfirmation';
import { WorkflowProgress } from './WorkflowProgress';
import { useWorkflowSocket } from '@/hooks/useWorkflowSocket';

export function ChatSection() {
  const selectedProjectId = useIdeStore((state) => state.selectedProjectId);
  useWorkflowSocket(selectedProjectId); // <-- WebSocket connection
  const setSelectedProjectId = useIdeStore((state) => state.setSelectedProjectId);
  const isProcessing = useIdeStore((state) => state.isProcessing);
  const setIsProcessing = useIdeStore((state) => state.setIsProcessing);
  const activeFile = useIdeStore((state) => state.activeFile);
  const activeView = useIdeStore((state) => state.activeView); 
  const activePreviewRoute = useIdeStore((state) => state.activePreviewRoute);

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
  const [toastMessage, setToastMessage] = useState<{ content: string; id: number } | null>(null);

  useEffect(() => {
    if (selectedProjectId) {
      refetch();
    }
  }, [selectedProjectId, refetch]);

  const { ref: topOfChatRef, inView: isTopOfChatVisible } = useInView({ threshold: 0 });

  useEffect(() => {
    if (isTopOfChatVisible && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isTopOfChatVisible, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const chatHistory = useMemo(() => {
    return data?.pages.flatMap((page) => page.messages).reverse() ?? [];
  }, [data]);

  useAuth();
  const { inputValue, setInputValue, handleKeyDown, addToHistory } = useInputHistory();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    workflowState,
    setWorkflowState,
    setWorkflowPlan,
    resetWorkflow,
  } = useIdeStore();

  const { mutate: sendMessage } = useSendMessage({
    onSuccess: (data) => {
      // This is the new logic to handle different response types
      if (data.type === 'PLAN_CONFIRMATION_REQUIRED') {
        setWorkflowPlan(data.payload.plan);
        setWorkflowState('awaiting_confirmation');
        setIsAIProcessing(false); // Stop the typing indicator
      } else if (data.type === 'SIMPLE_CHAT') {
        // The polling mechanism will pick up the new message,
        // so we just need to stop the local processing indicator.
        setIsAIProcessing(false);
      } else {
        // For now, let polling handle other cases like WORKFLOW_RESULT
        console.log('Received unhandled response type:', data.type);
        setIsAIProcessing(false);
      }
    },
    onError: (error) => {
      console.error('Failed to send message:', error);
      resetWorkflow(); // Reset workflow state on error
    },
    onSettled: () => {
      // General cleanup, but specific processing is handled in onSuccess/onError
      setIsProcessing(false);
    },
  });

  const { mutate: generateProject } = useGenerateProject({
    onSuccess: (data, variables) => {
      setSelectedProjectId(data.projectId);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      sendMessage({
        prompt: variables.projectDescription,
        chatHistory: [],
        projectId: data.projectId,
        context: variables.context,
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
  // 1) When AI starts processing (after user sends), keep view pinned to bottom
  useEffect(() => {
    if (isAIProcessing) {
      scrollToBottom('auto');
    }
  }, [isAIProcessing]);

  // 2) On new AI message, either scroll or show toast; also stop typing state
  useEffect(() => {
    if (chatHistory.length === 0) return;
    const lastMessage = chatHistory[chatHistory.length - 1];
    const isFromAI = lastMessage.role !== 'user';
    if (!isFromAI) return;

    // Stop the typing indicator once AI message arrives
    setIsAIProcessing(false);

    const chatContainer = chatContainerRef.current;
    if (!chatContainer) return;

    const { scrollHeight, scrollTop, clientHeight } = chatContainer;
    const isAtBottom = scrollHeight - scrollTop < clientHeight + 200;
    if (isAtBottom) {
      scrollToBottom();
    } else {
      const preview = (lastMessage as any).content || '';
      setToastMessage({ content: preview, id: Date.now() });
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [chatHistory]);

  // 3) On scroll, manage the "Scroll to Bottom" button visibility
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

    const messageContext = {
      activeView,
      activeFile,
      activePreviewRoute,
    };

    if (!selectedProjectId) {
      setIsProcessing(true);
      generateProject({
        projectName: `AI Project - ${new Date().toLocaleTimeString()}`,
        projectDescription: messageToSend,
        context: messageContext,
      });
    } else {
      const recentHistory = chatHistory.slice(-10);
      sendMessage({
        prompt: messageToSend,
        chatHistory: recentHistory,
        context: messageContext,
      });
    }
  };

  const handleKeyPress = (e: any) => {
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
        <div ref={topOfChatRef} />
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

      {/* --- Conditional Input Area --- */}
      <div className="chat-input-area">
        {workflowState === 'awaiting_confirmation' ? (
          <PlanConfirmation />
        ) : workflowState === 'running' ? (
          <WorkflowProgress />
        ) : (
          <>
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
              Send
            </button>
          </>
        )}
      </div>
    </div>
  );
}
