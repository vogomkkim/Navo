'use client';

import { useEffect, useRef, useState } from 'react';
import { useOrchestratorChat } from '@/lib/api';
import { useInputHistory } from '@/hooks/useInputHistory';
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

  const { inputValue, setInputValue, handleKeyDown, addToHistory } =
    useInputHistory();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const orchestratorChat = useOrchestratorChat({});

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

  useEffect(() => {
    if (currentWorkflowStep < WORKFLOW_STEPS.length) {
      setCurrentStepName(WORKFLOW_STEPS[currentWorkflowStep]);
    }
  }, [currentWorkflowStep]);

  const executeChat = async (userMessage: string) => {
    setIsProcessing(true);
    try {
      const result = await orchestratorChat.mutateAsync({ userMessage });
      const payload: any = result as any;
      const ok: boolean = payload?.ok === true;
      let text =
        payload?.data ??
        payload?.result?.data ??
        payload?.result?.message ??
        payload?.message;

      if (ok) {
        if (text === undefined || text === null) {
          text = '요청이 성공적으로 처리되었습니다.';
        }
        if (typeof text !== 'string') {
          try {
            text = JSON.stringify(text);
          } catch {
            text = String(text);
          }
        }
        const responseMessage: AgentMessage = {
          id: `response-${Date.now()}`,
          role: 'Strategic Planner',
          message: text,
          status: 'completed',
          timestamp: new Date(),
        };
        setChatHistory((prev: ChatMessage[]) => [...prev, responseMessage]);
      } else {
        const errorText = payload?.error || '백엔드 API 호출 실패';
        throw new Error(errorText);
      }
    } catch (error) {
      console.error('에이전트 시스템 오류:', error);
      let errorMessage =
        '❌ 새로운 에이전트 시스템 실행 중 오류가 발생했습니다.';
      if (error instanceof Error) {
        if (error.message.includes('Unauthorized')) {
          errorMessage = `❌ **인증 오류**\n\n로그인이 필요하거나 인증이 만료되었습니다.\n\n**해결 방법:**\n1. 로그인 상태 확인\n2. 페이지 새로고침 후 재시도\n3. 필요시 재로그인`;
        } else if (error.message.includes('API 오류')) {
          errorMessage = `❌ **백엔드 API 호출 오류**\n\n${error.message}\n\n**해결 방법:**\n1. 인터넷 연결 확인\n2. 서버 상태 확인\n3. 잠시 후 재시도`;
        } else if (
          error.message.includes('백엔드 API 응답 오류') ||
          error.message.includes('백엔드 API 호출 실패')
        ) {
          errorMessage = `❌ **백엔드 API 응답 오류**\n\n백엔드에서 성공 응답을 받지 못했습니다.\n\n**해결 방법:**\n1. 서버 상태 확인\n2. 잠시 후 재시도\n3. 개발자에게 문의`;
        } else {
          errorMessage = `❌ **예상치 못한 오류**\n\n${error.message}\n\n**해결 방법:**\n1. 브라우저 새로고침\n2. 개발자에게 문의`;
        }
      }
      const errorMessageObj: AgentMessage = {
        id: `error-${Date.now()}`,
        role: 'Strategic Planner',
        message: errorMessage,
        status: 'error',
        timestamp: new Date(),
      };
      setChatHistory((prev: ChatMessage[]) => [...prev, errorMessageObj]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;

    addToHistory(inputValue);

    const userMessage: UserMessage = {
      id: Date.now().toString(),
      role: 'user',
      message: inputValue,
      timestamp: new Date(),
    };

    setChatHistory((prev: ChatMessage[]) => [...prev, userMessage]);
    setInputValue('');

    await executeChat(inputValue);
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
