import { useState } from "react";

interface UseInputHistoryReturn {
  inputValue: string;
  setInputValue: (value: string) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  addToHistory: (message: string) => void;
  clearHistory: () => void;
}

export function useInputHistory(): UseInputHistoryReturn {
  const [inputValue, setInputValue] = useState("");
  const [messageHistory, setMessageHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

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
        setInputValue(""); // 원래 입력 상태로 복원
      } else if (historyIndex === -1) {
        // 가장 최신 상태에서 ↓ 누르면 빈 상태로
        setInputValue("");
      }
    }
  };

  const addToHistory = (message: string) => {
    setMessageHistory((prev) => [...prev, message]);
    setHistoryIndex(-1); // 히스토리 인덱스 초기화
  };

  const clearHistory = () => {
    setMessageHistory([]);
    setHistoryIndex(-1);
  };

  return {
    inputValue,
    setInputValue,
    handleKeyDown,
    addToHistory,
    clearHistory,
  };
}
