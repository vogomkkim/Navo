"use client";

import { useState, useRef, useEffect } from "react";
import { useMultiAgentSystem } from "@/lib/api";
import { geminiClient } from "@/lib/gemini";

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
      // 1단계: Strategic Planner (기획자)
      await executeStrategicPlanner(userMessage);

      // 2단계: Project Manager (PM)
      await executeProjectManager();

      // 3단계: Full-Stack Developer (개발자)
      await executeFullStackDeveloper();

      // 4단계: Quality Assurance Engineer (QA)
      await executeQualityAssurance();

      // 5단계: DevOps Engineer (엔지니어)
      await executeDevOpsEngineer();

      // 워크플로우 완료
      await completeWorkflow();
    } catch (error) {
      console.error("AI Agent 워크플로우 오류:", error);

      // 에러 유형별 메시지 생성
      let errorMessage = "❌ AI Agent 워크플로우 실행 중 오류가 발생했습니다.";

      if (error instanceof Error) {
        if (error.message.includes("Gemini API 키")) {
          errorMessage = `❌ **Gemini API 설정 오류**\n\n${error.message}\n\n**해결 방법:**\n1. .env.local 파일에 GEMINI_API_KEY 설정\n2. Google AI Studio에서 API 키 발급\n3. 브라우저 새로고침 후 재시도`;
        } else if (error.message.includes("API 오류")) {
          errorMessage = `❌ **Gemini API 호출 오류**\n\n${error.message}\n\n**해결 방법:**\n1. 인터넷 연결 확인\n2. API 키 유효성 확인\n3. 잠시 후 재시도`;
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
    }
  };

  // 1단계: Strategic Planner (기획자)
  const executeStrategicPlanner = async (userMessage: string) => {
    setCurrentWorkflowStep(0);

    const plannerMessage: AgentMessage = {
      id: `planner-${Date.now()}`,
      role: "Strategic Planner",
      message:
        "🔍 **Strategic Planner** 역할로 프로젝트 요구사항을 분석하고 있습니다...",
      status: "analyzing",
      timestamp: new Date(),
    };

    setChatHistory((prev: ChatMessage[]) => [...prev, plannerMessage]);

    try {
      // 실제 Gemini API 호출
      const analysisResult =
        await geminiClient.analyzeProjectRequirements(userMessage);

      const completedMessage: AgentMessage = {
        ...plannerMessage,
        message: `✅ **Strategic Planner** 완료!\n\n**프로젝트 분석 결과:**\n${analysisResult.summary}\n\n**핵심 요구사항:**\n${analysisResult.requirements.map((req: string) => `• ${req}`).join("\n")}\n\n**타겟 사용자:** ${analysisResult.targetAudience}\n\n**비즈니스 목표:**\n${analysisResult.businessGoals.map((goal: string) => `• ${goal}`).join("\n")}\n\n**성공 지표:**\n${analysisResult.successMetrics.map((metric: string) => `• ${metric}`).join("\n")}\n\n**다음 단계:** Project Manager가 프로젝트 계획을 수립합니다.`,
        status: "completed",
        details: analysisResult,
      };

      setChatHistory((prev: ChatMessage[]) =>
        prev.map((msg) =>
          msg.id === plannerMessage.id ? completedMessage : msg
        )
      );

      setProjectContext((prev: any) => ({
        ...prev,
        strategicAnalysis: analysisResult,
      }));
    } catch (error) {
      console.error("Strategic Planner 오류:", error);

      const errorMessage: AgentMessage = {
        ...plannerMessage,
        message: `❌ **Strategic Planner** 실행 중 오류가 발생했습니다.\n\n오류 내용: ${error instanceof Error ? error.message : "알 수 없는 오류"}`,
        status: "error",
      };

      setChatHistory((prev: ChatMessage[]) =>
        prev.map((msg) => (msg.id === plannerMessage.id ? errorMessage : msg))
      );

      throw error; // 상위로 오류 전파
    }
  };

  // 2단계: Project Manager (PM)
  const executeProjectManager = async () => {
    setCurrentWorkflowStep(1);

    const pmMessage: AgentMessage = {
      id: `pm-${Date.now()}`,
      role: "Project Manager",
      message:
        "📋 **Project Manager** 역할로 프로젝트 계획을 수립하고 있습니다...",
      status: "planning",
      timestamp: new Date(),
    };

    setChatHistory((prev: ChatMessage[]) => [...prev, pmMessage]);

    try {
      const projectPlan = await geminiClient.createProjectPlan(
        projectContext.strategicAnalysis
      );

      const completedMessage: AgentMessage = {
        ...pmMessage,
        message: `✅ **Project Manager** 완료!\n\n**프로젝트 계획:**\n${projectPlan.summary}\n\n**기술 스택:**\n${projectPlan.techStack.map((tech: string) => `• ${tech}`).join("\n")}\n\n**일정:** ${projectPlan.timeline}\n\n**마일스톤:**\n${projectPlan.milestones.map((milestone: string) => `• ${milestone}`).join("\n")}\n\n**위험 요소:**\n${projectPlan.risks.map((risk: string) => `• ${risk}`).join("\n")}\n\n**필요 리소스:**\n${projectPlan.resources.map((resource: string) => `• ${resource}`).join("\n")}\n\n**다음 단계:** Full-Stack Developer가 아키텍처를 설계하고 코드를 생성합니다.`,
        status: "completed",
        details: projectPlan,
      };

      setChatHistory((prev: ChatMessage[]) =>
        prev.map((msg) => (msg.id === pmMessage.id ? completedMessage : msg))
      );

      setProjectContext((prev: any) => ({ ...prev, projectPlan }));
    } catch (error) {
      console.error("Project Manager 오류:", error);

      const errorMessage: AgentMessage = {
        ...pmMessage,
        message: `❌ **Project Manager** 실행 중 오류가 발생했습니다.\n\n오류 내용: ${error instanceof Error ? error.message : "알 수 없는 오류"}`,
        status: "error",
      };

      setChatHistory((prev: ChatMessage[]) =>
        prev.map((msg) => (msg.id === pmMessage.id ? errorMessage : msg))
      );

      throw error;
    }
  };

  // 3단계: Full-Stack Developer (개발자)
  const executeFullStackDeveloper = async () => {
    setCurrentWorkflowStep(2);

    const developerMessage: AgentMessage = {
      id: `developer-${Date.now()}`,
      role: "Full-Stack Developer",
      message:
        "⚡ **Full-Stack Developer** 역할로 아키텍처를 설계하고 코드를 생성하고 있습니다...",
      status: "developing",
      timestamp: new Date(),
    };

    setChatHistory((prev: ChatMessage[]) => [...prev, developerMessage]);

    try {
      const developmentResult = await geminiClient.generateProjectCode(
        projectContext.projectPlan,
        projectContext.userRequest
      );

      const completedMessage: AgentMessage = {
        ...developerMessage,
        message: `✅ **Full-Stack Developer** 완료!\n\n**아키텍처 설계:**\n${developmentResult.architecture}\n\n**데이터베이스 스키마:**\n${developmentResult.databaseSchema.map((table: string) => `• ${table}`).join("\n")}\n\n**생성된 컴포넌트:**\n${developmentResult.components.map((comp: string) => `• ${comp}`).join("\n")}\n\n**API 엔드포인트:**\n${developmentResult.apis.map((api: string) => `• ${api}`).join("\n")}\n\n**보안 기능:**\n${developmentResult.securityFeatures.map((feature: string) => `• ${feature}`).join("\n")}\n\n**성능 최적화:**\n${developmentResult.performanceOptimizations.map((opt: string) => `• ${opt}`).join("\n")}\n\n**다음 단계:** Quality Assurance Engineer가 코드 품질을 검증합니다.`,
        status: "completed",
        details: developmentResult,
      };

      setChatHistory((prev: ChatMessage[]) =>
        prev.map((msg) =>
          msg.id === developerMessage.id ? completedMessage : msg
        )
      );

      setProjectContext((prev: any) => ({ ...prev, developmentResult }));
    } catch (error) {
      console.error("Full-Stack Developer 오류:", error);

      const errorMessage: AgentMessage = {
        ...developerMessage,
        message: `❌ **Full-Stack Developer** 실행 중 오류가 발생했습니다.\n\n오류 내용: ${error instanceof Error ? error.message : "알 수 없는 오류"}`,
        status: "error",
      };

      setChatHistory((prev: ChatMessage[]) =>
        prev.map((msg) => (msg.id === developerMessage.id ? errorMessage : msg))
      );

      throw error;
    }
  };

  // 4단계: Quality Assurance Engineer (QA)
  const executeQualityAssurance = async () => {
    setCurrentWorkflowStep(3);

    const qaMessage: AgentMessage = {
      id: `qa-${Date.now()}`,
      role: "Quality Assurance Engineer",
      message:
        "🔍 **Quality Assurance Engineer** 역할로 코드 품질을 검증하고 있습니다...",
      status: "testing",
      timestamp: new Date(),
    };

    setChatHistory((prev: ChatMessage[]) => [...prev, qaMessage]);

    try {
      const qaResult = await geminiClient.performQualityAssurance(
        projectContext.developmentResult
      );

      const completedMessage: AgentMessage = {
        ...qaMessage,
        message: `✅ **Quality Assurance Engineer** 완료!\n\n**품질 검증 결과:**\n${qaResult.summary}\n\n**테스트 커버리지:** ${qaResult.testCoverage}\n\n**성능 점수:** ${qaResult.performanceScore}\n\n**보안 검증:** ${qaResult.securityStatus}\n\n**개선 제안:**\n${qaResult.improvements.map((imp: string) => `• ${imp}`).join("\n")}\n\n**테스트 계획:**\n${qaResult.testPlan.map((test: string) => `• ${test}`).join("\n")}\n\n**다음 단계:** DevOps Engineer가 배포 환경을 구축합니다.`,
        status: "completed",
        details: qaResult,
      };

      setChatHistory((prev: ChatMessage[]) =>
        prev.map((msg) => (msg.id === qaMessage.id ? completedMessage : msg))
      );

      setProjectContext((prev: any) => ({ ...prev, qaResult }));
    } catch (error) {
      console.error("Quality Assurance Engineer 오류:", error);

      const errorMessage: AgentMessage = {
        ...qaMessage,
        message: `❌ **Quality Assurance Engineer** 실행 중 오류가 발생했습니다.\n\n오류 내용: ${error instanceof Error ? error.message : "알 수 없는 오류"}`,
        status: "error",
      };

      setChatHistory((prev: ChatMessage[]) =>
        prev.map((msg) => (msg.id === qaMessage.id ? errorMessage : msg))
      );

      throw error;
    }
  };

  // 5단계: DevOps Engineer (엔지니어)
  const executeDevOpsEngineer = async () => {
    setCurrentWorkflowStep(4);

    const devopsMessage: AgentMessage = {
      id: `devops-${Date.now()}`,
      role: "DevOps Engineer",
      message: "🚀 **DevOps Engineer** 역할로 배포 환경을 구축하고 있습니다...",
      status: "deploying",
      timestamp: new Date(),
    };

    setChatHistory((prev: ChatMessage[]) => [...prev, devopsMessage]);

    try {
      const devopsResult = await geminiClient.setupDeploymentEnvironment(
        projectContext.qaResult
      );

      const completedMessage: AgentMessage = {
        ...devopsMessage,
        message: `✅ **DevOps Engineer** 완료!\n\n**배포 환경:**\n${devopsResult.environment}\n\n**CI/CD 파이프라인:** ${devopsResult.cicdStatus}\n\n**모니터링 시스템:** ${devopsResult.monitoringStatus}\n\n**성능 최적화:** ${devopsResult.optimizationStatus}\n\n**백업 전략:** ${devopsResult.backupStrategy}\n\n**확장 계획:** ${devopsResult.scalingPlan}\n\n**프로젝트가 성공적으로 배포되었습니다! 🎉"`,
        status: "completed",
        details: devopsResult,
      };

      setChatHistory((prev: ChatMessage[]) =>
        prev.map((msg) =>
          msg.id === devopsMessage.id ? completedMessage : msg
        )
      );

      setProjectContext((prev: any) => ({ ...prev, devopsResult }));
    } catch (error) {
      console.error("DevOps Engineer 오류:", error);

      const errorMessage: AgentMessage = {
        ...devopsMessage,
        message: `❌ **DevOps Engineer** 실행 중 오류가 발생했습니다.\n\n오류 내용: ${error instanceof Error ? error.message : "알 수 없는 오류"}`,
        status: "error",
      };

      setChatHistory((prev: ChatMessage[]) =>
        prev.map((msg) => (msg.id === devopsMessage.id ? errorMessage : msg))
      );

      throw error;
    }
  };

  // 워크플로우 완료
  const completeWorkflow = async () => {
    const completionMessage: AgentMessage = {
      id: `completion-${Date.now()}`,
      role: "Strategic Planner",
      message: `🎉 **AI Project Orchestrator Agent 워크플로우 완료!**\n\n모든 단계가 성공적으로 완료되었습니다:\n\n${WORKFLOW_STEPS.map((step, index) => `**${index + 1}. ${step}** ✅`).join("\n")}\n\n**프로젝트 요약:**\n${projectContext.userRequest}\n\n**생성된 결과물:**\n• 프로젝트 아키텍처 설계\n• 완성된 코드베이스\n• 품질 검증 보고서\n• 배포 환경 구축\n\n이제 프로젝트를 바로 사용하실 수 있습니다! 🚀`,
      status: "completed",
      timestamp: new Date(),
    };

    setChatHistory((prev: ChatMessage[]) => [...prev, completionMessage]);
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
              <span>• 전자상거래 웹사이트</span>
              <span>• 블로그 플랫폼</span>
              <span>• 경매 사이트</span>
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
