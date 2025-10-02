"use client";

import { useAuth } from "@/app/context/AuthContext";
import { useInputHistory } from "@/hooks/useInputHistory";
import { useGetMessages, useSendMessage } from "@/hooks/api";
import { useGenerateProject } from "@/hooks/api/useAi";
import { useIdeStore } from "@/store/ideStore";
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  UIEvent,
  useCallback,
} from "react";
import { useInView } from "react-intersection-observer";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronDownIcon,
  Cross2Icon,
  PaperPlaneIcon,
  MagicWandIcon,
} from "@radix-ui/react-icons";
import { PlanConfirmation } from "./PlanConfirmation";
import { WorkflowProgress } from "./WorkflowProgress";
import { useWorkflowEvents } from "@/hooks/useWorkflowEvents";
import { useProposalHandler } from "@/hooks/useProposalHandler";
import { ProposalCard } from "../workflow/ProposalCard";
import type { WorkflowResponse } from "@/types/workflow";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

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
        예시: &quot;우리 동네 강아지들을 위한 산책 커뮤니티 사이트
        만들어줘&quot;
      </span>
    </p>
  </div>
);

export function ChatSection() {
  const {
    messages,
    addMessage,
    updateMessage,
    isProcessing,
    setIsProcessing,
    selectedProjectId,
    setSelectedProjectId,
    workflowState,
    setWorkflowPlan,
    resetWorkflow,
    activeFile,
    activeView,
    activePreviewRoute,
  } = useIdeStore();

  const { ensureConnection } = useWorkflowEvents(selectedProjectId);
  const {
    activeProposal,
    isProcessing: isProposalProcessing,
    setActiveProposal,
    approveProposal,
    rejectProposal
  } = useProposalHandler(selectedProjectId);
  const queryClient = useQueryClient();

  const {
    data: serverMessagesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingMessages,
    refetch,
  } = useGetMessages(selectedProjectId);

  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    content: string;
    id: number;
    type?: "info" | "error" | "success";
  } | null>(null);

  const scrollToBottom = useCallback(
    (behavior: "smooth" | "auto" = "smooth") => {
      messagesEndRef.current?.scrollIntoView({ behavior });
    },
    []
  );

  useEffect(() => {
    if (selectedProjectId) {
      refetch().then((result) => {
        const initialMessages =
          result.data?.pages
            .flatMap((page) => page.messages.messages)
            .reverse() || [];
        useIdeStore.setState({ messages: initialMessages });

        // 초기 메시지 로드 후 자동 스크롤
        setTimeout(() => {
          scrollToBottom("auto");
        }, 100);
      });
    } else {
      useIdeStore.setState({ messages: [] });
    }
  }, [selectedProjectId, refetch, scrollToBottom]);

  const { ref: topOfChatRef, inView: isTopOfChatVisible } = useInView({
    threshold: 0,
  });

  useEffect(() => {
    if (isTopOfChatVisible && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isTopOfChatVisible, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const chatHistory = useMemo(() => {
    const allMessages =
      serverMessagesData?.pages.flatMap((page) => page.messages.messages) ?? [];
    return allMessages.reverse();
  }, [serverMessagesData]);

  // 서버에서 메시지가 로드되면 자동 스크롤
  useEffect(() => {
    if (chatHistory.length > 0 && !isLoadingMessages) {
      setTimeout(() => {
        scrollToBottom("auto");
      }, 50);
    }
  }, [chatHistory.length, isLoadingMessages, scrollToBottom]);

  useAuth();
  const { inputValue, setInputValue, handleKeyDown, addToHistory } =
    useInputHistory();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { mutate: sendMessage } = useSendMessage({
    onSuccess: (response: WorkflowResponse, variables) => {
      // Find the original 'sending' message and update its status to 'success'
      const originalMessage = messages.find((m) => m.id === variables.tempId);
      if (originalMessage) {
        updateMessage(originalMessage.id, { status: "success" });
      }

      // If response includes projectId (new project case), update selected project
      if ((response as any).projectId && !selectedProjectId) {
        const newProjectId = (response as any).projectId;
        console.log('✅ New project created:', newProjectId);
        setSelectedProjectId(newProjectId);
        // Refresh project list
        queryClient.invalidateQueries({ queryKey: ['projects'] });
      }

      // Handle different WorkflowResponse types
      switch (response.type) {
        case 'EXECUTION_STARTED':
          console.log('✅ Workflow execution started:', response.runId);
          // SSE will handle real-time updates
          setWorkflowPlan(response.planSummary as any);
          useIdeStore.setState({ workflowState: "running" });
          break;

        case 'PROPOSAL_REQUIRED':
          console.log('📋 Proposal required:', response.proposalId);
          setActiveProposal(response);
          // Optionally add a message to chat
          addMessage({
            id: `proposal-${response.proposalId}`,
            role: "assistant",
            message: `AI가 작업 계획을 제안했습니다. (신뢰도: ${Math.round(response.confidence * 100)}%)`,
            timestamp: new Date(),
            status: "success",
          });
          break;

        case 'CLARIFICATION_NEEDED':
          console.log('❓ Clarification needed');
          // Future: Handle clarification questions
          break;

        case 'ERROR':
          console.error('❌ Workflow error:', response.errorCode);
          addMessage({
            id: `error-${Date.now()}`,
            role: "assistant",
            message: response.message,
            timestamp: new Date(),
            status: "error",
          });
          break;

        default:
          console.warn('⚠️ Unknown response type:', (response as any).type);
      }

      // Legacy: Handle old PLAN_CONFIRMATION_REQUIRED format if still present
      if ((response as any).type === "PLAN_CONFIRMATION_REQUIRED") {
        setWorkflowPlan((response as any).payload.plan);
        useIdeStore.setState({ workflowState: "awaiting_confirmation" });
      }
    },
    onError: (error, variables) => {
      const originalMessage = messages.find((m) => m.id === variables.tempId);
      if (originalMessage) {
        updateMessage(originalMessage.id, {
          status: "error",
          error: error.message,
        });
      }

      // 사용자에게 에러 알림
      setToastMessage({
        content: `메시지 전송 실패: ${error.message}`,
        id: Date.now(),
        type: "error",
      });

      // 3초 후 토스트 메시지 자동 제거
      setTimeout(() => {
        setToastMessage(null);
      }, 3000);

      resetWorkflow();
    },
    onSettled: () => {
      setIsProcessing(false);
    },
  });

  const { mutate: generateProject } = useGenerateProject({
    onSuccess: (data, variables) => {
      const originalMessage = messages.find((m) => m.id === variables.tempId);
      if (originalMessage) {
        updateMessage(originalMessage.id, { status: "success" });
      }

      // 응답 타입이 CREATE_PROJECT인지 확인
      if ((data as any).type === "CREATE_PROJECT") {
        const outputs = (data as any).payload?.outputs;
        const newProjectId = outputs?.step1_create_db_record?.projectId;

        if (newProjectId) {
          setSelectedProjectId(newProjectId);
          queryClient.invalidateQueries({ queryKey: ["projects"] });
        } else {
          console.error(
            "Could not find new projectId in CREATE_PROJECT response",
            data
          );
        }
      } else {
        // SIMPLE_CHAT이나 다른 타입의 응답인 경우
        console.log(
          "Received non-CREATE_PROJECT response:",
          (data as any).type
        );
      }
    },
    onError: (error, variables) => {
      const originalMessage = messages.find((m) => m.id === variables.tempId);
      if (originalMessage) {
        updateMessage(originalMessage.id, {
          status: "error",
          error: error.message,
        });
      }

      // 사용자에게 에러 알림
      setToastMessage({
        content: `프로젝트 생성 실패: ${error.message}`,
        id: Date.now(),
        type: "error",
      });

      // 3초 후 토스트 메시지 자동 제거
      setTimeout(() => {
        setToastMessage(null);
      }, 3000);
    },
    onSettled: () => {
      setIsProcessing(false);
    },
  });

  useEffect(() => {
    if (isProcessing) {
      scrollToBottom("auto");
    }
  }, [isProcessing, scrollToBottom]);

  useEffect(() => {
    if (chatHistory.length === 0) return;
    const lastMessage = chatHistory[chatHistory.length - 1];
    const isFromAI = lastMessage.role !== "user";
    if (!isFromAI) return;

    setIsProcessing(false);

    const chatContainer = chatContainerRef.current;
    if (!chatContainer) return;

    const { scrollHeight, scrollTop, clientHeight } = chatContainer;
    const isAtBottom = scrollHeight - scrollTop < clientHeight + 200;
    if (isAtBottom) {
      scrollToBottom();
    } else {
      // 새로 생성된 메시지만 토스트 표시 (최근 5초 이내 생성된 메시지)
      const messageTime = new Date(
        (lastMessage as any).createdAt || (lastMessage as any).timestamp
      );
      const now = new Date();
      const timeDiff = now.getTime() - messageTime.getTime();
      const isNewMessage = timeDiff < 5000; // 5초 이내

      if (isNewMessage) {
        const preview = (lastMessage as any).content || "";
        setToastMessage({ content: preview, id: Date.now() });
        const timer = setTimeout(() => setToastMessage(null), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [chatHistory, scrollToBottom]);

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isScrolledUp = scrollHeight - scrollTop > clientHeight + 300;
    setShowScrollToBottom(isScrolledUp);
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;

    // SSE 연결 확인
    if (selectedProjectId) {
      const isConnected = await ensureConnection();
      if (!isConnected) {
        console.warn("SSE 연결 실패 - AI 응답을 실시간으로 받을 수 없습니다");
      }
    }

    const messageToSend = inputValue;
    const tempId = `user-message-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    addToHistory(messageToSend);
    setInputValue("");
    setIsProcessing(true);

    addMessage({
      id: tempId,
      role: "user",
      message: messageToSend,
      timestamp: new Date(),
      status: "sending",
    });

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
    }

    // Extract filename from activeFile (remove UUID, keep readable path)
    const getReadableFileName = (fileId: string | null): string | null => {
      if (!fileId) return null;

      // If it's already a readable path (contains /), return as is
      if (fileId.includes('/')) return fileId;

      // If it's a UUID, try to get the actual filename from nodesById
      const nodeMeta = useIdeStore.getState().nodesById[fileId];
      return nodeMeta?.name || nodeMeta?.path || fileId;
    };

    const messageContext = {
      activeView,
      activeFile: getReadableFileName(activeFile),
      activePreviewRoute,
    };

    const recentHistory = messages.slice(-10);

    // 프로젝트가 없으면 "new"를 projectId로 사용
    // 백엔드가 자동으로 프로젝트 생성 후 응답에 projectId 포함
    sendMessage({
      prompt: messageToSend,
      chatHistory: recentHistory,
      context: messageContext,
      tempId,
      projectId: selectedProjectId || "new", // 프로젝트가 없으면 "new" 사용
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const hasHistory = messages.length > 0;

  return (
    <div className="relative flex flex-col h-full bg-slate-50 border-r border-gray-200">
      <div
        className={cn(
          "flex-1 p-4 pb-24",
          hasHistory ? "overflow-y-auto" : "overflow-hidden"
        )}
        ref={chatContainerRef}
        onScroll={handleScroll}
      >
        <div ref={topOfChatRef} />
        {isLoadingMessages && !hasHistory ? (
          <div className="text-center text-gray-500">
            {t('chat.loading')}
          </div>
        ) : !hasHistory && !isProcessing ? (
          <EmptyChatPlaceholder />
        ) : (
          <div className="space-y-6">
            {messages.map((message: any) => {
              const isUser = message.role === "user";
              return (
                <div
                  key={message.id || `fallback-${Math.random()}`}
                  className={cn(
                    "flex items-end gap-2 animate-in fade-in-50 slide-in-from-bottom-2 duration-500",
                    isUser ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-lg px-4 py-2.5 rounded-2xl shadow-sm",
                      isUser
                        ? "bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-br-lg"
                        : "bg-white text-gray-800 border border-gray-200/80 rounded-bl-lg",
                      message.status === "sending" && "opacity-70"
                    )}
                  >
                    <div className="prose prose-sm max-w-none">
                      {message.message || message.content}
                    </div>
                    {isUser && message.status === "error" && (
                      <div className="text-red-100 text-xs mt-1">
                        {t('chat.errorPrefix')}: {message.error}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Active Proposal Card */}
        {activeProposal && (
          <div className="mt-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
            <ProposalCard
              proposal={activeProposal}
              onApprove={async (proposalId) => {
                try {
                  const result = await approveProposal(proposalId);

                  // Handle EXECUTION_STARTED response
                  if (result && result.type === 'EXECUTION_STARTED') {
                    console.log('✅ Execution started after approval:', result);

                    // Update workflow state
                    setWorkflowState('running');
                    setWorkflowPlan(result.planSummary);

                    // Connect to SSE for real-time updates
                    ensureConnection();

                    // Add success message
                    addMessage({
                      id: `approved-${Date.now()}`,
                      role: "assistant",
                      message: `✅ 제안을 승인했습니다. "${result.planSummary.name}" 실행을 시작합니다.`,
                      timestamp: new Date(),
                      status: "success",
                    });
                  }
                } catch (error) {
                  console.error('Failed to approve proposal:', error);
                  addMessage({
                    id: `error-${Date.now()}`,
                    role: "assistant",
                    message: "제안 승인에 실패했습니다. 다시 시도해주세요.",
                    timestamp: new Date(),
                    status: "error",
                  });
                }
              }}
              onReject={async (proposalId) => {
                try {
                  await rejectProposal(proposalId);
                  addMessage({
                    id: `reject-${Date.now()}`,
                    role: "assistant",
                    message: "제안을 거절했습니다.",
                    timestamp: new Date(),
                    status: "success",
                  });
                } catch (error) {
                  console.error('Failed to reject proposal:', error);
                }
              }}
            />
          </div>
        )}

        {isProcessing &&
          messages.every(
            (m) => m.role !== "user" || m.status !== "sending"
          ) && (
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
        <div ref={messagesEndRef} data-messages-end />
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200/80 bg-slate-50/80 backdrop-blur-sm">
        <div className="absolute bottom-full left-0 right-0 p-4 pointer-events-none">
          {toastMessage && (
            <div
              className={`pointer-events-auto w-full max-w-md mx-auto cursor-pointer rounded-lg border p-3 shadow-lg transition-all hover:bg-gray-50 animate-in fade-in-50 slide-in-from-bottom-2 ${
                toastMessage.type === "error"
                  ? "bg-red-50 border-red-200 text-red-800"
                  : "bg-white border-gray-200/80 text-gray-800"
              }`}
              onClick={() => scrollToBottom()}
            >
              <p className="text-sm font-medium">
                {toastMessage.type === "error" ? "오류 발생:" : "새 메시지:"}
              </p>
              <p className="text-xs truncate">{toastMessage.content}</p>
              <button
                className="absolute top-1 right-1 p-1 text-gray-600 rounded-full hover:bg-gray-200"
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

        {workflowState === "awaiting_confirmation" ? (
          <PlanConfirmation />
        ) : workflowState === "running" ? (
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
              disabled={isProcessing}
              rows={1}
              className="flex-grow resize-none border-0 bg-transparent py-2.5 pl-4 pr-2 text-base leading-relaxed focus:outline-none focus:ring-0 max-h-48"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isProcessing}
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
