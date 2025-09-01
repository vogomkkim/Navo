'use client';

import { useState, useRef, useEffect } from 'react';
import { useMultiAgentSystem } from '@/lib/api';
import { ChatPlaceholder } from './ChatPlaceholder';
import { useInputHistory } from '@/hooks/useInputHistory';
import { useQueryClient } from '@tanstack/react-query'; // React Query 클라이언트 추가
import { useAuth } from '@/app/context/AuthContext';
import { fetchApi } from '@/lib/api';

// AI Agent 역할 정의
type AgentRole =
  | 'Strategic Planner'
  | 'Project Manager'
  | 'Full-Stack Developer'
  | 'Quality Assurance Engineer'
  | 'DevOps Engineer';

// AI Agent 상태
type AgentStatus =
  | 'waiting'
  | 'analyzing'
  | 'planning'
  | 'developing'
  | 'testing'
  | 'deploying'
  | 'completed'
  | 'error';

// AI Agent 메시지
interface AgentMessage {
  id: string;
  role: AgentRole;
  message: string;
  status: AgentStatus;
  timestamp: Date;
  details?: any; // 각 역할별 상세 정보
  suggestions?: string[]; // 개선 제안
}

// 사용자 메시지
interface UserMessage {
  id: string;
  role: 'user';
  message: string;
  timestamp: Date;
}

// 통합 메시지 타입
type ChatMessage = UserMessage | AgentMessage;

// AI Agent 워크플로우 단계
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
  const [projectContext, setProjectContext] = useState<any>({});
  const [currentStepName, setCurrentStepName] = useState<string>('');
  const { token } = useAuth();

  // 방향키 히스토리 훅 사용
  const { inputValue, setInputValue, handleKeyDown, addToHistory } =
    useInputHistory();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const multiAgent = useMultiAgentSystem({});
  const queryClient = useQueryClient(); // React Query 클라이언트 인스턴스 생성

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 입력창 자동 높이 조정
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

  // 입력창 내용 변경 시 자동 높이 조정
  useEffect(() => {
    autoResize();
  }, [inputValue]);

  // 현재 단계 이름 업데이트
  useEffect(() => {
    if (currentWorkflowStep < WORKFLOW_STEPS.length) {
      setCurrentStepName(WORKFLOW_STEPS[currentWorkflowStep]);
    }
  }, [currentWorkflowStep]);

  // AI Agent 워크플로우 실행
  const executeAIAgentWorkflow = async (userMessage: string) => {
    setIsProcessing(true);
    setCurrentWorkflowStep(0);

    // 사용자 요청을 프로젝트 컨텍스트에 저장
    setProjectContext({ userRequest: userMessage });

    try {
      // 백엔드 멀티 에이전트 시스템 호출
      const result = await multiAgent.mutateAsync({
        message: userMessage,
        context: {
          projectId: `project-${Date.now()}`,
          sessionId: `session-${Date.now()}`,
          userAgent: navigator.userAgent,
          url: window.location.href,
        },
      });

      if (result.success) {
        // 최종 완료 메시지만 표시 (중간 과정 메시지 제거)
        const completionMessage: AgentMessage = {
          id: `completion-${Date.now()}`,
          role: 'Strategic Planner',
          message: `🎉 **AI Project Orchestrator Agent 워크플로우 완료!**\n\n모든 단계가 성공적으로 완료되었습니다:\n\n${result.agents.map((agent, index) => `**${index + 1}. ${agent.agentName}** ✅`).join('\n')}\n\n**프로젝트 요약:**\n${userMessage}\n\n**총 실행 시간:** ${result.totalExecutionTime}ms\n\n**최종 요약:**\n${result.summary}\n\n이제 프로젝트를 바로 사용하실 수 있습니다! 🚀`,
          status: 'completed',
          timestamp: new Date(),
        };

        setChatHistory((prev: ChatMessage[]) => [...prev, completionMessage]);

        // 프로젝트 생성 성공 시 React Query 캐시 무효화
        queryClient.invalidateQueries({ queryKey: ['projects'] });

        // 생성된 프로젝트 자동 선택 시도
        try {
          let createdProjectId = (result as any).projectId;
          if (!createdProjectId) {
            const list = await fetchApi<{ projects: any[] }>('/api/projects', {
              token,
            });
            const sorted = (list.projects || []).sort(
              (a, b) =>
                new Date(b.updatedAt).getTime() -
                new Date(a.updatedAt).getTime()
            );
            createdProjectId = sorted[0]?.id;
          }
          if (createdProjectId && onProjectCreated) {
            onProjectCreated(createdProjectId);
          }
        } catch (e) {
          // ignore selection errors
        }
      } else {
        throw new Error('백엔드 API 호출 실패');
      }
    } catch (error) {
      console.error('AI Agent 워크플로우 오류:', error);

      // 에러 유형별 메시지 생성
      let errorMessage = '❌ AI Agent 워크플로우 실행 중 오류가 발생했습니다.';

      if (error instanceof Error) {
        if (error.message.includes('Unauthorized')) {
          errorMessage = `❌ **인증 오류**\n\n로그인이 필요하거나 인증이 만료되었습니다.\n\n**해결 방법:**\n1. 로그인 상태 확인\n2. 페이지 새로고침 후 재시도\n3. 필요시 재로그인`;
        } else if (error.message.includes('API 오류')) {
          errorMessage = `❌ **백엔드 API 호출 오류**\n\n${error.message}\n\n**해결 방법:**\n1. 인터넷 연결 확인\n2. 서버 상태 확인\n3. 잠시 후 재시도`;
        } else if (error.message.includes('백엔드 API 호출 실패')) {
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
      setCurrentWorkflowStep(0);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;

    // 메시지 히스토리에 추가
    addToHistory(inputValue);

    const userMessage: UserMessage = {
      id: Date.now().toString(),
      role: 'user',
      message: inputValue,
      timestamp: new Date(),
    };

    setChatHistory((prev: ChatMessage[]) => [...prev, userMessage]);
    setInputValue('');

    // AI Agent 워크플로우 시작
    await executeAIAgentWorkflow(inputValue);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
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
