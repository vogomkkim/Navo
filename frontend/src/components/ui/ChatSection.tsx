'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useInputHistory } from '@/hooks/useInputHistory';
import { useGetMessages, useSendMessage } from '@/hooks/api';
import { useGenerateProject } from '@/hooks/api/useAi';
import { useIdeStore } from '@/store/ideStore';
import React, { useEffect, useMemo, useRef, useState, UIEvent } from 'react';
import { useInView } from 'react-intersection-observer';
import { useQueryClient } from '@tanstack/react-query';
import {
  ChevronDownIcon,
  Cross2Icon,
  PaperPlaneIcon,
  MagicWandIcon,
} from '@radix-ui/react-icons';
import { PlanConfirmation } from './PlanConfirmation';
import { WorkflowProgress } from './WorkflowProgress';
import { useWorkflowSocket } from '@/hooks/useWorkflowSocket';
import { cn } from '@/lib/utils';

const EmptyChatPlaceholder = () => (
  <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 px-4">
    <MagicWandIcon className="w-16 h-16 mb-6 text-gray-300" />
    <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-700 to-gray-500 bg-clip-text text-transparent">
      Navo AI와 함께 시작하세요
    </h2>
    <p className="mt-3 max-w-md text-gray-500">
      만들고 싶은 웹사이트나 애플리케이션에 대해 자유롭게 이야기해주세요.
      <br />
      <span className="text-sm text-gray-400 mt-2 block">
        예시: &quot;우리 동네 강아지들을 위한 산책 커뮤니티 사이트 만들어줘&quot;
      </span>
    </p>
  </div>
);

export function ChatSection() {
  const selectedProjectId = useIdeStore((state) => state.selectedProjectId);
  useWorkflowSocket(selectedProjectId);
  const setSelectedProjectId = useIdeStore(
    (state) => state.setSelectedProjectId,
  );
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
    const allMessages = data?.pages.flatMap((page) => page.messages) ?? [];
    return allMessages.reverse();
  }, [data]);

  useAuth();
  const { inputValue, setInputValue, handleKeyDown, addToHistory } =
    useInputHistory();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { workflowState, setWorkflowPlan, resetWorkflow } = useIdeStore();

  const { mutate: sendMessage } = useSendMessage({
    onSuccess: (data) => {
      if (data.type === 'PLAN_CONFIRMATION_REQUIRED') {
        setWorkflowPlan(data.payload.plan);
        useIdeStore.setState({ workflowState: 'awaiting_confirmation' });
        setIsAIProcessing(false);
      } else {
        setIsAIProcessing(false);
      }
    },
    onError: (error) => {
      console.error('메시지 전송 실패:', error);
      resetWorkflow();
    },
    onSettled: () => {
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
      console.error('프로젝트 생성 실패:', error);
      setIsProcessing(false);
    },
  });

  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (isAIProcessing) {
      scrollToBottom('auto');
    }
  }, [isAIProcessing]);

  useEffect(() => {
    if (chatHistory.length === 0) return;
    const lastMessage = chatHistory[chatHistory.length - 1];
    const isFromAI = lastMessage.role !== 'user';
    if (!isFromAI) return;

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

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isScrolledUp = scrollHeight - scrollTop > clientHeight + 300;
    setShowScrollToBottom(isScrolledUp);
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  const handleSendMessage = () => {
    if (!inputValue.trim() || isProcessing || isAIProcessing) return;
    const messageToSend = inputValue;
    addToHistory(messageToSend);
    setInputValue('');
    setIsAIProcessing(true);

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
    }

    const messageContext = {
      activeView,
      activeFile,
      activePreviewRoute,
    };

    if (!selectedProjectId) {
      setIsProcessing(true);
      generateProject({
        projectName: `AI 프로젝트 - ${new Date().toLocaleTimeString()}`,
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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const hasHistory = chatHistory.length > 0;

  return (
    <div className="relative flex flex-col h-full bg-slate-50 border-r border-gray-200">
      <div
        className={cn(
          'flex-1 p-4 pb-24',
          hasHistory ? 'overflow-y-auto' : 'overflow-hidden'
        )}
        ref={chatContainerRef}
        onScroll={handleScroll}
      >
        <div ref={topOfChatRef} />
        {isLoading ? (
          <div className="text-center text-gray-500">대화 내역을 불러오는 중...</div>
        ) : !hasHistory && !isAIProcessing ? (
          <EmptyChatPlaceholder />
        ) : (
          <div className="space-y-6">
            {chatHistory.map((message: any) => {
              const isUser = message.role === 'user';
              return (
                <div
                  key={message.id}
                  className={cn(
                    'flex items-end gap-2 animate-in fade-in-50 slide-in-from-bottom-2 duration-500',
                    isUser ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-lg px-4 py-2.5 rounded-2xl shadow-sm',
                      isUser
                        ? 'bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-br-lg'
                        : 'bg-white text-gray-800 border border-gray-200/80 rounded-bl-lg'
                    )}
                  >
                    <div className="prose prose-sm max-w-none">{message.content}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {isAIProcessing && (
          <div className="flex justify-start animate-in fade-in-50">
            <div className="max-w-lg px-4 py-2.5 rounded-2xl bg-white border border-gray-200/80 shadow-sm">
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-0"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-300"></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200/80 bg-slate-50/80 backdrop-blur-sm">
        <div className="absolute bottom-full left-0 right-0 p-4 pointer-events-none">
          {toastMessage && (
            <div
              className="pointer-events-auto w-full max-w-md mx-auto cursor-pointer rounded-lg bg-blue-500 p-3 text-white shadow-lg transition-all hover:bg-blue-600 animate-in fade-in-50 slide-in-from-bottom-2"
              onClick={() => scrollToBottom()}
            >
              <p className="text-sm font-medium">새 메시지:</p>
              <p className="text-xs truncate">{toastMessage.content}</p>
              <button
                className="absolute top-1 right-1 p-1 text-white rounded-full hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  setToastMessage(null);
                }}
              >
                <Cross2Icon className="h-3 w-3" />
              </button>
            </div>
          )}
          {showScrollToBottom && !toastMessage && (
            <button
              className="pointer-events-auto absolute bottom-4 right-8 grid h-8 w-8 place-items-center rounded-full bg-white shadow-md transition-transform hover:scale-110 animate-in fade-in-50"
              onClick={() => scrollToBottom()}
            >
              <ChevronDownIcon className="h-5 w-5 text-gray-600" />
            </button>
          )}
        </div>
        
        {workflowState === 'awaiting_confirmation' ? (
          <PlanConfirmation />
        ) : workflowState === 'running' ? (
          <WorkflowProgress />
        ) : (
          <div className="flex items-center relative w-full rounded-full border border-gray-300 bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-500 transition-all">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={handleInput}
              onKeyDown={(e) => {
                handleKeyPress(e);
                handleKeyDown(e);
              }}
              placeholder="만들고 싶은 것을 여기에 설명해주세요..."
              disabled={isProcessing || isAIProcessing}
              rows={1}
              className="flex-grow resize-none border-0 bg-transparent py-2.5 pl-4 pr-2 text-base leading-relaxed focus:outline-none focus:ring-0 max-h-48"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isProcessing || isAIProcessing}
              className="grid h-8 w-8 mr-1.5 flex-shrink-0 place-items-center rounded-full bg-blue-600 text-white transition-all hover:bg-blue-700 hover:scale-105 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:scale-100"
              aria-label="메시지 전송"
            >
              <PaperPlaneIcon />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
