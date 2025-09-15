import { useEffect, useState } from 'react';

interface UseInputHistoryReturn {
  inputValue: string;
  setInputValue: (value: string) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  addToHistory: (message: string) => void;
  clearHistory: () => void;
  messageHistory: string[];
}

const HISTORY_KEY = 'navo_input_history';
const MAX_HISTORY_SIZE = 10;

export function useInputHistory(): UseInputHistoryReturn {
  const [inputValue, setInputValue] = useState('');
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
      console.warn('Failed to load input history from localStorage:', error);
    }
  }, []);

  // 히스토리 변경 시 localStorage에 저장
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(messageHistory));
    } catch (error) {
      console.warn('Failed to save input history to localStorage:', error);
    }
  }, [messageHistory]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.target as HTMLTextAreaElement;

    if (e.key === 'ArrowUp') {
      const caretPositionBefore = textarea.selectionStart;
      
      setTimeout(() => {
        const caretPositionAfter = textarea.selectionStart;
        if (caretPositionBefore === caretPositionAfter) {
          // 커서가 움직이지 않았으므로 히스토리 탐색 실행
          if (messageHistory.length === 0) return;

          if (historyIndex === -1) {
            // 새로운 탐색 시작
            const newIndex = messageHistory.length - 1;
            setHistoryIndex(newIndex);
            setInputValue(messageHistory[newIndex]);
          } else if (historyIndex > 0) {
            // 이전 히스토리로 이동
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setInputValue(messageHistory[newIndex]);
          }
        }
      }, 0);
      return;
    }

    if (e.key === 'ArrowDown') {
      const caretPositionBefore = textarea.selectionStart;

      setTimeout(() => {
        const caretPositionAfter = textarea.selectionStart;
        if (caretPositionBefore === caretPositionAfter) {
          // 커서가 움직이지 않았으므로 히스토리 탐색 실행
          if (historyIndex === -1) return; // 탐색 중이 아닐 때는 아무것도 안 함

          if (historyIndex < messageHistory.length - 1) {
            // 다음 히스토리로 이동
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            setInputValue(messageHistory[newIndex]);
          } else if (historyIndex === messageHistory.length - 1) {
            // 히스토리 탐색 종료
            setHistoryIndex(-1);
            setInputValue('');
          }
        }
      }, 0);
      return;
    }
  };

  const addToHistory = (message: string) => {
    if (!message.trim()) return;

    setMessageHistory((prevHistory) => {
      const filteredHistory = prevHistory.filter((item) => item !== message);
      const newHistory = [...filteredHistory, message];

      if (newHistory.length > MAX_HISTORY_SIZE) {
        newHistory.splice(0, newHistory.length - MAX_HISTORY_SIZE);
      }
      
      // 상태 업데이트와 동시에 localStorage에 동기적으로 저장
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
      } catch (error) {
        console.warn('Failed to save input history to localStorage:', error);
      }

      return newHistory;
    });

    setHistoryIndex(-1);
  };

  const clearHistory = () => {
    setMessageHistory([]);
    setHistoryIndex(-1);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch (error) {
      console.warn('Failed to clear input history from localStorage:', error);
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
