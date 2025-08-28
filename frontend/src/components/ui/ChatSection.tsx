"use client";

import { useState, useRef, useEffect } from "react";
import { useMultiAgentSystem } from "@/lib/api";

// AI Agent 역할 정의
type AgentRole =
  | "Strategic Planner"
  | "Project Manager"
  | "Full-Stack Developer"
  | "Quality Assurance Engineer"
  | "DevOps Engineer";

// AI Agent 상태
type AgentStatus =
  | "waiting"
  | "analyzing"
  | "planning"
  | "developing"
  | "testing"
  | "deploying"
  | "completed"
  | "error";

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
  message: string;
  timestamp: Date;
}

// 통합 메시지 타입
type ChatMessage = UserMessage | AgentMessage;

// AI Agent 워크플로우 단계
const WORKFLOW_STEPS: AgentRole[] = [
  "Strategic Planner",
  "Project Manager",
  "Full-Stack Developer",
  "Quality Assurance Engineer",
  "DevOps Engineer",
];

export function ChatSection() {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentWorkflowStep, setCurrentWorkflowStep] = useState(0);
  const [projectContext, setProjectContext] = useState<any>({});
  const [currentStepName, setCurrentStepName] = useState<string>("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const multiAgent = useMultiAgentSystem({});

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 입력창 자동 높이 조정
  const autoResize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  // 입력창 내용 변경 시 자동 높이 조정
  useEffect(() => {
    autoResize();
  }, [inputMessage]);

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
        // 각 에이전트의 결과를 순차적으로 표시
        for (let i = 0; i < result.agents.length; i++) {
          const agent = result.agents[i];

          // 현재 단계 업데이트
          setCurrentWorkflowStep(i);

          // 에이전트 메시지 생성
          const agentMessage: AgentMessage = {
            id: `${agent.agentName}-${Date.now()}-${i}`,
            role: agent.agentName as AgentRole,
            message: `✅ **${agent.agentName}** 완료!\n\n${agent.message}`,
            status: agent.status === "completed" ? "completed" : "error",
            timestamp: new Date(),
            details: agent.data,
            suggestions: agent.nextSteps,
          };

          setChatHistory((prev: ChatMessage[]) => [...prev, agentMessage]);

          // 다음 단계로 진행하기 전에 잠시 대기 (사용자 경험 향상)
          if (i < result.agents.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }

        // 워크플로우 완료 메시지
        const completionMessage: AgentMessage = {
          id: `completion-${Date.now()}`,
          role: "Strategic Planner",
          message: `🎉 **AI Project Orchestrator Agent 워크플로우 완료!**\n\n모든 단계가 성공적으로 완료되었습니다:\n\n${result.agents.map((agent, index) => `**${index + 1}. ${agent.agentName}** ✅`).join("\n")}\n\n**프로젝트 요약:**\n${userMessage}\n\n**총 실행 시간:** ${result.totalExecutionTime}ms\n\n**최종 요약:**\n${result.summary}\n\n이제 프로젝트를 바로 사용하실 수 있습니다! 🚀`,
          status: "completed",
          timestamp: new Date(),
        };

        setChatHistory((prev: ChatMessage[]) => [...prev, completionMessage]);
      } else {
        throw new Error("백엔드 API 호출 실패");
      }
    } catch (error) {
      console.error("AI Agent 워크플로우 오류:", error);

      // 에러 유형별 메시지 생성
      let errorMessage = "❌ AI Agent 워크플로우 실행 중 오류가 발생했습니다.";

      if (error instanceof Error) {
        if (error.message.includes("Unauthorized")) {
          errorMessage = `❌ **인증 오류**\n\n로그인이 필요하거나 인증이 만료되었습니다.\n\n**해결 방법:**\n1. 로그인 상태 확인\n2. 페이지 새로고침 후 재시도\n3. 필요시 재로그인`;
        } else if (error.message.includes("API 오류")) {
          errorMessage = `❌ **백엔드 API 호출 오류**\n\n${error.message}\n\n**해결 방법:**\n1. 인터넷 연결 확인\n2. 서버 상태 확인\n3. 잠시 후 재시도`;
        } else if (error.message.includes("백엔드 API 호출 실패")) {
          errorMessage = `❌ **백엔드 API 응답 오류**\n\n백엔드에서 성공 응답을 받지 못했습니다.\n\n**해결 방법:**\n1. 서버 상태 확인\n2. 잠시 후 재시도\n3. 개발자에게 문의`;
        } else {
          errorMessage = `❌ **예상치 못한 오류**\n\n${error.message}\n\n**해결 방법:**\n1. 브라우저 새로고침\n2. 개발자에게 문의`;
        }
      }

      const errorMessageObj: AgentMessage = {
        id: `error-${Date.now()}`,
        role: "Strategic Planner",
        message: errorMessage,
        status: "error",
        timestamp: new Date(),
      };

      setChatHistory((prev: ChatMessage[]) => [...prev, errorMessageObj]);
    } finally {
      setIsProcessing(false);
      setCurrentWorkflowStep(0);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isProcessing) return;

    const userMessage: UserMessage = {
      id: Date.now().toString(),
      message: inputMessage,
      timestamp: new Date(),
    };

    setChatHistory((prev: ChatMessage[]) => [...prev, userMessage]);
    setInputMessage("");

    // AI Agent 워크플로우 시작
    await executeAIAgentWorkflow(inputMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="chat-container">
      {/* 채팅 메시지 영역 */}
      <div className="chat-messages">
        {chatHistory.length === 0 ? (
          <div className="chat-placeholder">
            <div className="placeholder-icon">💬</div>
            <h3>AI와 대화를 시작해보세요</h3>
            <p>어떤 프로젝트를 만들고 싶으신가요?</p>
            <div className="placeholder-examples">
              <button
                className="example-button"
                onClick={() => {
                  setInputMessage("전자상거래 웹사이트 만들어줘");
                  setTimeout(() => handleSendMessage(), 100);
                }}
              >
                • 전자상거래 웹사이트
              </button>
              <button
                className="example-button"
                onClick={() => {
                  setInputMessage("블로그 플랫폼 만들어줘");
                  setTimeout(() => handleSendMessage(), 100);
                }}
              >
                • 블로그 플랫폼
              </button>
              <button
                className="example-button"
                onClick={() => {
                  setInputMessage("경매 사이트 만들어줘");
                  setTimeout(() => handleSendMessage(), 100);
                }}
              >
                • 경매 사이트
              </button>
            </div>
          </div>
        ) : (
          chatHistory.map((message) => (
            <div
              key={message.id}
              className={`chat-message ${"role" in message ? "agent" : "user"}`}
            >
              <div className="message-content">
                <div className="message-header">
                  <span className="message-sender">
                    {"role" in message ? message.role : "사용자"}
                  </span>
                  <span className="message-time">
                    {message.timestamp.toLocaleTimeString("ko-KR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="message-text">
                  {message.message.split("\n").map((line, index) => (
                    <span key={index}>
                      {line}
                      {index < message.message.split("\n").length - 1 && <br />}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="chat-input-area">
        <div className="input-container">
          <textarea
            ref={textareaRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="메시지를 입력하세요..."
            disabled={isProcessing}
            rows={2}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isProcessing}
            className="send-button"
            title={
              isProcessing
                ? `AI Agent 작업 중... (${currentStepName})`
                : "프로젝트 시작"
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
