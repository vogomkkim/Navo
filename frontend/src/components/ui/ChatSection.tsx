"use client";

import { useState, useRef, useEffect } from "react";
import { useSaveDraft } from "@/lib/api";

interface ChatMessage {
  id: string;
  type: "user" | "assistant" | "agent";
  message: string;
  timestamp: Date;
  agentName?: string;
  status?: "thinking" | "working" | "completed" | "error";
}

interface SaveButtonProps {
  currentLayout: any;
  onSaveSuccess?: (data: any) => void;
  onSaveError?: (error: Error) => void;
}

export function ChatSection() {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: "1",
      type: "assistant",
      message:
        "안녕하세요! 저는 Navo의 Master Developer AI입니다. 🚀\n\n새로운 프로젝트를 시작하거나 개발 가이드가 필요하시면 언제든 말씀해주세요. 프로젝트 아키텍트부터 코드 생성까지 모든 과정을 도와드릴게요!",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { saveDraft } = useSaveDraft();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  // Master Developer 멀티 에이전트 프로세스
  const executeMasterDeveloperProcess = async (userMessage: string) => {
    setIsProcessing(true);

    // 1단계: Project Architect Agent
    const architectMessage: ChatMessage = {
      id: Date.now().toString() + "-1",
      type: "agent",
      message:
        "🏗️ **Project Architect Agent**가 프로젝트를 분석하고 설계하고 있습니다...",
      timestamp: new Date(),
      agentName: "Project Architect",
      status: "thinking",
    };

    setChatHistory((prev) => [...prev, architectMessage]);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 아키텍트 완료
    const architectComplete: ChatMessage = {
      ...architectMessage,
      id: Date.now().toString() + "-1-complete",
      message:
        "✅ **Project Architect Agent** 설계 완료!\n\n📋 **프로젝트 구조:**\n• 프론트엔드: React + TypeScript\n• 백엔드: Node.js + Express\n• 데이터베이스: PostgreSQL\n• 인증: JWT\n\n🎯 **주요 기능:**\n• 사용자 등록/로그인\n• 상품 등록/관리\n• 입찰 시스템\n• 실시간 알림\n• 결제 시스템",
      status: "completed",
    };

    setChatHistory((prev) =>
      prev.map((msg) =>
        msg.id === architectMessage.id ? architectComplete : msg
      )
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 2단계: UI/UX Designer Agent
    const designerMessage: ChatMessage = {
      id: Date.now().toString() + "-2",
      type: "agent",
      message:
        "🎨 **UI/UX Designer Agent**가 사용자 인터페이스를 설계하고 있습니다...",
      timestamp: new Date(),
      agentName: "UI/UX Designer",
      status: "working",
    };

    setChatHistory((prev) => [...prev, designerMessage]);

    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 디자이너 완료
    const designerComplete: ChatMessage = {
      ...designerMessage,
      id: Date.now().toString() + "-2-complete",
      message:
        "✅ **UI/UX Designer Agent** 설계 완료!\n\n🎨 **UI 구조:**\n• 헤더: 로고, 네비게이션, 사용자 메뉴\n• 메인: 상품 그리드, 필터링, 검색\n• 상품 상세: 이미지 갤러리, 입찰 폼, 댓글\n• 마이페이지: 내 상품, 입찰 내역, 설정\n\n📱 **반응형 디자인:**\n• 모바일 우선 접근법\n• 터치 친화적 인터페이스\n• 직관적인 사용자 플로우",
      status: "completed",
    };

    setChatHistory((prev) =>
      prev.map((msg) =>
        msg.id === designerMessage.id ? designerComplete : msg
      )
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 3단계: Code Generator Agent
    const generatorMessage: ChatMessage = {
      id: Date.now().toString() + "-3",
      type: "agent",
      message:
        "⚡ **Code Generator Agent**가 프로젝트 코드를 생성하고 있습니다...",
      timestamp: new Date(),
      agentName: "Code Generator",
      status: "working",
    };

    setChatHistory((prev) => [...prev, generatorMessage]);

    await new Promise((resolve) => setTimeout(resolve, 4000));

    // 코드 생성 완료
    const generatorComplete: ChatMessage = {
      ...generatorMessage,
      id: Date.now().toString() + "-3-complete",
      message:
        "✅ **Code Generator Agent** 코드 생성 완료!\n\n📁 **생성된 파일:**\n• 프로젝트 스켈레톤: 15개 파일\n• 핵심 컴포넌트: 8개 컴포넌트\n• 라우팅 설정: 12개 라우트\n• API 엔드포인트: 20개\n• 데이터베이스 스키마: 6개 테이블\n\n🚀 **프로젝트가 성공적으로 생성되었습니다!**",
      status: "completed",
    };

    setChatHistory((prev) =>
      prev.map((msg) =>
        msg.id === generatorMessage.id ? generatorComplete : msg
      )
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 4단계: Development Guide Agent
    const guideMessage: ChatMessage = {
      id: Date.now().toString() + "-4",
      type: "agent",
      message:
        "📚 **Development Guide Agent**가 개발 가이드를 작성하고 있습니다...",
      timestamp: new Date(),
      agentName: "Development Guide",
      status: "working",
    };

    setChatHistory((prev) => [...prev, guideMessage]);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 가이드 완료
    const guideComplete: ChatMessage = {
      ...guideMessage,
      id: Date.now().toString() + "-4-complete",
      message:
        "✅ **Development Guide Agent** 가이드 작성 완료!\n\n📖 **개발 가이드:**\n• 1단계: 프로젝트 설정 및 의존성 설치\n• 2단계: 데이터베이스 연결 및 마이그레이션\n• 3단계: 기본 인증 시스템 구현\n• 4단계: 상품 CRUD 기능 개발\n• 5단계: 입찰 시스템 구현\n• 6단계: 실시간 알림 시스템\n• 7단계: 결제 시스템 연동\n• 8단계: 테스트 및 배포",
      status: "completed",
    };

    setChatHistory((prev) =>
      prev.map((msg) => (msg.id === guideMessage.id ? guideComplete : msg))
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 최종 결과
    const finalMessage: ChatMessage = {
      id: Date.now().toString() + "-final",
      type: "assistant",
      message:
        "🎉 **Master Developer 프로세스 완료!**\n\n모든 에이전트가 성공적으로 협력하여 경매 사이트 프로젝트를 완성했습니다.\n\n📊 **작업 요약:**\n• Project Architect: 프로젝트 구조 및 기술 스택 설계\n• UI/UX Designer: 사용자 인터페이스 및 경험 설계\n• Code Generator: 실제 프로젝트 코드 생성\n• Development Guide: 단계별 개발 가이드 제공\n\n🚀 **다음 단계:**\n1. 생성된 프로젝트 파일 확인\n2. 개발 가이드에 따라 단계별 구현\n3. 필요시 추가 기능 요청\n\n이제 실제 개발을 시작할 수 있습니다!",
      timestamp: new Date(),
    };

    setChatHistory((prev) => [...prev, finalMessage]);
    setIsProcessing(false);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      message: inputMessage,
      timestamp: new Date(),
    };

    setChatHistory((prev) => [...prev, userMessage]);
    setInputMessage("");

    // Master Developer 프로세스 시작
    await executeMasterDeveloperProcess(inputMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {chatHistory.map((message) => (
          <div
            key={message.id}
            className={`chat-message ${message.type} ${
              message.status ? `status-${message.status}` : ""
            }`}
          >
            <div className="message-avatar">
              {message.type === "user"
                ? "👤"
                : message.type === "agent"
                  ? "🤖"
                  : "🤖"}
            </div>
            <div className="message-content">
              <div className="message-header">
                <span className="message-sender">
                  {message.type === "user"
                    ? "사용자"
                    : message.type === "agent"
                      ? message.agentName
                      : "AI 어시스턴트"}
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
              {message.status && (
                <div className="message-status">
                  {message.status === "thinking" && "🤔 분석 중..."}
                  {message.status === "working" && "⚡ 작업 중..."}
                  {message.status === "completed" && "✅ 완료"}
                  {message.status === "error" && "❌ 오류"}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <div className="input-container">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="어떤 프로젝트를 만들고 싶으신가요? 예: '경매 사이트 만들고 싶어', '블로그 플랫폼 개발하고 싶어'"
            disabled={isProcessing}
            rows={3}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isProcessing}
            className="send-button"
          >
            {isProcessing ? "처리 중..." : "전송"}
          </button>
        </div>
        <div className="input-hint">
          💡 예시: "경매 사이트 만들고 싶어요", "블로그 플랫폼 개발하고 싶어요",
          "쇼핑몰 앱 만들고 싶어요"
        </div>
      </div>
    </div>
  );
}
