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
  const setSelectedProjectId = useIdeStore((state) => state.setSelectedProjectId);
  const isProcessing = useIdeStore((state) => state.isProcessing);
  const setIsProcessing = useIdeStore((state) => state.setIsProcessing);
  const activeFile = useIdeStore((state) => state.activeFile);
  // Assuming you add activeView and activePreviewRoute to your ideStore
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

  const { user } = useAuth();
  const { inputValue, setInputValue, handleKeyDown, addToHistory } = useInputHistory();

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

  // ... (Intelligent Scroll Logic remains the same) ...

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
      const recentHistory = chatHistory.slice(-10).map(m => ({ role: m.role, message: m.content }));
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

  return (
    <div className="chat-container">
      {/* ... (The rest of the JSX remains the same) ... */}
    </div>
  );
}