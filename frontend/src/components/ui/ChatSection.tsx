'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';

import { useInputHistory } from '@/hooks/useInputHistory';
import { useExecuteWorkflow } from '@/lib/api';

import { ChatPlaceholder } from './ChatPlaceholder';

// Agent roles and statuses
type AgentRole =
  | 'Strategic Planner'
  | 'Project Manager'
  | 'Full-Stack Developer'
  | 'Quality Assurance Engineer'
  | 'DevOps Engineer';

type AgentStatus =
  | 'waiting'
  | 'analyzing'
  | 'planning'
  | 'developing'
  | 'testing'
  | 'deploying'
  | 'completed'
  | 'error';

interface AgentMessage {
  id: string;
  role: AgentRole;
  message: string;
  status: AgentStatus;
  timestamp: Date;
  details?: any;
  suggestions?: string[];
}

interface UserMessage {
  id: string;
  role: 'user';
  message: string;
  timestamp: Date;
}

type ChatMessage = UserMessage | AgentMessage;

const WORKFLOW_STEPS: AgentRole[] = [
  'Strategic Planner',
  'Project Manager',
  'Full-Stack Developer',
  'Quality Assurance Engineer',
  'DevOps Engineer',
];

interface ChatSectionProps {
  onReset?: () => void;
  onProjectCreated?: (projectId: string) => void;
}

export function ChatSection({ onReset, onProjectCreated }: ChatSectionProps) {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentWorkflowStep, setCurrentWorkflowStep] = useState(0);
  const [currentStepName, setCurrentStepName] = useState<string>('');
  const { user } = useAuth();

  const { inputValue, setInputValue, handleKeyDown, addToHistory } =
    useInputHistory();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  const { mutate: executeWorkflow, isPending: isWorkflowRunning } =
    useExecuteWorkflow({
      onSuccess: (data) => {
        // When the workflow is successful, invalidate queries to refetch data
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        queryClient.invalidateQueries({ queryKey: ['vfsNodes'] });

        const finalOutput = data.outputs[data.plan.steps.slice(-1)[0].id];
        const responseMessage: AgentMessage = {
          id: `response-${Date.now()}`,
          role: 'DevOps Engineer', // Assuming the last step is deployment/finalizing
          message:
            '프로젝트 생성이 완료되었습니다! 파일 트리에서 결과를 확인하세요.',
          status: 'completed',
          timestamp: new Date(),
          details: finalOutput,
        };
        setChatHistory((prev) => [...prev, responseMessage]);
      },
      onError: (error) => {
        const errorMessage: AgentMessage = {
          id: `error-${Date.now()}`,
          role: 'Strategic Planner',
          message: `❌ 워크플로우 실행 중 오류가 발생했습니다: ${error.message}`,
          status: 'error',
          timestamp: new Date(),
        };
        setChatHistory((prev) => [...prev, errorMessage]);
      },
      onSettled: () => {
        setIsProcessing(false);
      },
    });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const autoResize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + 'px';
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  useEffect(() => {
    autoResize();
  }, [inputValue]);

  // Persist chat history per user in localStorage
  useEffect(() => {
    try {
      const storageKey = user?.id
        ? `navo_chat_history_${user.id}`
        : 'navo_chat_history_guest';
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Array<{
          id: string;
          role: string;
          message: string;
          timestamp: string | number;
          status?: string;
          details?: any;
          suggestions?: string[];
        }>;
        const revived: ChatMessage[] = parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
        setChatHistory(revived);
      }
    } catch (e) {
      console.warn('Failed to load chat history from localStorage', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    try {
      const storageKey = user?.id
        ? `navo_chat_history_${user.id}`
        : 'navo_chat_history_guest';
      const serializable = chatHistory.map((m) => ({
        ...m,
        timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
      }));
      localStorage.setItem(storageKey, JSON.stringify(serializable));
    } catch (e) {
      console.warn('Failed to save chat history to localStorage', e);
    }
  }, [chatHistory, user?.id]);

  useEffect(() => {
    if (currentWorkflowStep < WORKFLOW_STEPS.length) {
      setCurrentStepName(WORKFLOW_STEPS[currentWorkflowStep]);
    }
  }, [currentWorkflowStep]);

  const handleSendMessage = () => {
    if (!inputValue.trim() || isProcessing) return;

    addToHistory(inputValue);
    const userMessage: UserMessage = {
      id: Date.now().toString(),
      role: 'user',
      message: inputValue,
      timestamp: new Date(),
    };

    setChatHistory((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);

    const thinkingMessage: AgentMessage = {
      id: `thinking-${Date.now()}`,
      role: 'Strategic Planner',
      message: '요청을 분석하여 실행 계획을 수립하고 있습니다...',
      status: 'planning',
      timestamp: new Date(),
    };
    setChatHistory((prev) => [...prev, thinkingMessage]);

    executeWorkflow({ prompt: inputValue });
  };

  const handleKeyPress = (e: any) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="chat-container">
      {/* 채팅 메시지 영역 */}
      <div className="chat-messages">
        {chatHistory.length === 0 ? (
          <ChatPlaceholder
            onExampleClick={(message) => {
              setInputValue(message);
              setTimeout(() => handleSendMessage(), 100);
            }}
          />
        ) : (
          chatHistory.map((message) => {
            const isUser = (message as any).role === 'user';
            return (
              <div
                key={message.id}
                className={`chat-message ${isUser ? 'user' : 'ai'}`}
              >
                <div className="message-avatar">{isUser ? '👤' : '🤖'}</div>
                <div className={`message-bubble ${isUser ? 'user' : 'ai'}`}>
                  <div className="message-sender">
                    {isUser ? '사용자' : (message as any).role}
                  </div>
                  <div className="message-text">{message.message}</div>
                  <div className="message-timestamp">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            );
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="chat-input-area">
        <div className="input-container">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요... (↑↓ 방향키로 이전 메시지 탐색)"
            disabled={isProcessing}
            rows={2}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isProcessing}
            className="send-button"
            title={
              isProcessing
                ? `AI Agent 작업 중... (${currentStepName})`
                : '프로젝트 시작'
            }
          >
            {isProcessing ? (
              <span className="loading-spinner">⏳</span>
            ) : (
              <span className="send-icon">✈️</span>
            )}
          </button>
        </div>
        <div className="input-hint">
          💡 **AI Project Orchestrator Agent**가 기획자, PM, 개발자, QA,
          엔지니어 역할을 모두 수행하여 프로젝트를 완성합니다!
        </div>
      </div>
    </div>
  );
}
