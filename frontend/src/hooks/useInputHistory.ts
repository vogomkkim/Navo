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

  const isCaretAtStart = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    return target.selectionStart === 0 && target.selectionEnd === 0;
  };

  const isCaretAtEnd = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    const valueLength = target.value.length;
    return (
      target.selectionStart === valueLength &&
      target.selectionEnd === valueLength
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'ArrowUp') {
      // 위 화살표는 커서가 맨 앞(첫 줄의 시작)일 때만 히스토리 이동
      if (!isCaretAtStart(e)) return; // 기본 캐럿 이동 허용
      e.preventDefault();

      if (messageHistory.length === 0) return;

      if (historyIndex === -1) {
        setHistoryIndex(messageHistory.length - 1);
        setInputValue(messageHistory[messageHistory.length - 1]);
        return;
      }

      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInputValue(messageHistory[newIndex]);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      // 아래 화살표는 커서가 맨 끝(마지막 줄의 끝)일 때만 히스토리 이동
      if (!isCaretAtEnd(e)) return; // 기본 캐럿 이동 허용
      e.preventDefault();

      if (messageHistory.length === 0) return;

      if (historyIndex < messageHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInputValue(messageHistory[newIndex]);
      } else if (historyIndex === messageHistory.length - 1) {
        setHistoryIndex(-1);
        setInputValue('');
      } else if (historyIndex === -1) {
        setInputValue('');
      }
      return;
    }
  };

  const addToHistory = (message: string) => {
    if (!message.trim()) return;

    const filteredHistory = messageHistory.filter((item) => item !== message);
    const newHistory = [...filteredHistory, message];

    if (newHistory.length > MAX_HISTORY_SIZE) {
      newHistory.splice(0, newHistory.length - MAX_HISTORY_SIZE);
    }

    setMessageHistory(newHistory);
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
