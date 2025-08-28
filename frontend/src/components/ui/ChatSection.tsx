"use client";

import { useState, useRef, useEffect } from "react";
import { useMultiAgentSystem } from "@/lib/api";

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
  const multiAgent = useMultiAgentSystem({});

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  // Master Developer 멀티 에이전트 프로세스 (백엔드 호출)
  const executeMasterDeveloperProcess = async (userMessage: string) => {
    setIsProcessing(true);

    // Streaming-like placeholders
    const placeholderIds = ["-1","-2","-3","-4"].map((suf) => `${Date.now()}${suf}`);
    const placeholders: ChatMessage[] = [
      { id: placeholderIds[0], type: "agent", message: "🏗️ Project Architect Agent가 분석 중...", timestamp: new Date(), agentName: "Project Architect", status: "thinking" },
      { id: placeholderIds[1], type: "agent", message: "🎨 UI/UX Designer Agent가 설계 중...", timestamp: new Date(), agentName: "UI/UX Designer", status: "working" },
      { id: placeholderIds[2], type: "agent", message: "⚡ Code Generator Agent가 코드 생성 중...", timestamp: new Date(), agentName: "Code Generator", status: "working" },
      { id: placeholderIds[3], type: "agent", message: "📚 Development Guide Agent가 가이드 작성 중...", timestamp: new Date(), agentName: "Development Guide", status: "working" },
    ];
    setChatHistory((prev) => [...prev, ...placeholders]);

    try {
      const res = await multiAgent.mutateAsync({ message: userMessage });

      // Update placeholders with server responses
      const updated = placeholders.map((ph, idx) => {
        const agent = res.agents[idx];
        if (!agent) return ph;
        return {
          ...ph,
          message: `✅ ${agent.agentName} 완료!\n\n${agent.message}`,
          status: agent.status,
        };
      });
      setChatHistory((prev) =>
        prev.map((msg) => {
          const i = placeholders.findIndex((p) => p.id === msg.id);
          return i >= 0 ? updated[i] : msg;
        })
      );

      const finalMessage: ChatMessage = {
        id: `${Date.now()}-final`,
        type: "assistant",
        message:
          "🎉 Master Developer 프로세스 완료!\n\n" +
          "• Project Architect: 아키텍처 설계 완료\n" +
          "• UI/UX Designer: 인터페이스 설계 완료\n" +
          "• Code Generator: 코드 구조 생성 완료\n" +
          "• Development Guide: 개발 가이드 완료",
        timestamp: new Date(),
      };
      setChatHistory((prev) => [...prev, finalMessage]);
    } catch (e) {
      const errorMessage: ChatMessage = {
        id: `${Date.now()}-error`,
        type: "assistant",
        message: "❌ 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
        timestamp: new Date(),
        status: "error",
      };
      setChatHistory((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
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
          💡 예시: &ldquo;경매 사이트 만들고 싶어요&rdquo;, &ldquo;블로그 플랫폼 개발하고 싶어요&rdquo;,
          &ldquo;쇼핑몰 앱 만들고 싶어요&rdquo;
        </div>
      </div>
    </div>
  );
}
