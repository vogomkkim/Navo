import { useState, useEffect } from "react";

interface UseInputHistoryReturn {
  inputValue: string;
  setInputValue: (value: string) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  addToHistory: (message: string) => void;
  clearHistory: () => void;
  messageHistory: string[];
}

const HISTORY_KEY = "navo_input_history";
const MAX_HISTORY_SIZE = 10;

export function useInputHistory(): UseInputHistoryReturn {
  const [inputValue, setInputValue] = useState("");
  const [messageHistory, setMessageHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // 컴포넌트 마운트 시 localStorage에서 히스토리 로드
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(HISTORY_KEY);
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory);
        if (Array.isArray(parsedHistory)) {
          setMessageHistory(parsedHistory);
        }
      }
    } catch (error) {
      console.warn("Failed to load input history from localStorage:", error);
    }
  }, []);

  // 히스토리 변경 시 localStorage에 저장
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(messageHistory));
    } catch (error) {
      console.warn("Failed to save input history to localStorage:", error);
    }
  }, [messageHistory]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();

      if (historyIndex < messageHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInputValue(messageHistory[messageHistory.length - 1 - newIndex]);
      }
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();

      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInputValue(messageHistory[messageHistory.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputValue(""); // 빈 값으로 초기화
      } else if (historyIndex === -1) {
        // 이미 빈 상태에서 ↓ 누르면 그대로 빈 상태 유지
        setInputValue("");
      }
    }
  };

  const addToHistory = (message: string) => {
    // 빈 메시지는 히스토리에 추가하지 않음
    if (!message.trim()) {
      return;
    }

    // 중복 메시지 제거 (최신 메시지가 이미 히스토리에 있으면 제거)
    const filteredHistory = messageHistory.filter((item) => item !== message);

    // 새 메시지를 맨 앞에 추가
    const newHistory = [message, ...filteredHistory];

    // 최대 10개까지만 유지 (가장 오래된 것부터 삭제)
    if (newHistory.length > MAX_HISTORY_SIZE) {
      newHistory.splice(MAX_HISTORY_SIZE);
    }

    setMessageHistory(newHistory);
    setHistoryIndex(-1); // 히스토리 인덱스 초기화
  };

  const clearHistory = () => {
    setMessageHistory([]);
    setHistoryIndex(-1);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch (error) {
      console.warn("Failed to clear input history from localStorage:", error);
    }
  };

  return {
    inputValue,
    setInputValue,
    handleKeyDown,
    addToHistory,
    clearHistory,
    messageHistory,
  };
}
