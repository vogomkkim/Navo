"use client";

import { useState } from "react";

export function ChatSection() {
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<
    Array<{
      id: number;
      type: "user" | "assistant";
      message: string;
      timestamp: Date;
    }>
  >([
    // 초기 메시지
    {
      id: 1,
      type: "assistant",
      message: "안녕하세요! 무엇을 도와드릴까요?",
      timestamp: new Date(),
    },
  ]);

  const handleSendChat = () => {
    if (chatInput.trim()) {
      // 사용자 메시지 추가
      const userMessage = {
        id: Date.now(),
        type: "user" as const,
        message: chatInput,
        timestamp: new Date(),
      };

      setChatHistory((prev) => [...prev, userMessage]);
      setChatInput("");

      // TODO: AI 응답 처리
      setTimeout(() => {
        const aiResponse = {
          id: Date.now() + 1,
          type: "assistant" as const,
          message: "메시지를 받았습니다. AI 응답을 처리 중입니다...",
          timestamp: new Date(),
        };
        setChatHistory((prev) => [...prev, aiResponse]);
      }, 1000);
    }
  };

  return (
    <div className="chat-container">
      {/* 채팅 메시지 영역 */}
      <div className="chat-messages">
        {chatHistory.map((chat) => (
          <div key={chat.id} className={`chat-message ${chat.type}`}>
            <div className="chat-message-content">
              <div className="chat-message-avatar">
                {chat.type === "user" ? "👤" : "🤖"}
              </div>
              <div className="chat-message-text">{chat.message}</div>
              <div className="chat-message-time">
                {chat.timestamp.toLocaleTimeString("ko-KR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 채팅 입력 영역 */}
      <div className="chat-input-area">
        <div className="chat-input-container">
          <input
            type="text"
            className="chat-input"
            placeholder="Ask me anything..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleSendChat();
              }
            }}
          />
          <button className="chat-send-button" onClick={handleSendChat}>
            <span className="send-icon">➤</span>
          </button>
        </div>
      </div>
    </div>
  );
}
