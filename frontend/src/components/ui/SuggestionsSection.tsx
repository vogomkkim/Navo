'use client';

import { useState } from 'react';
import { useSuggestions } from '@/lib/api';

export function SuggestionsSection() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const { data, isLoading, isError, error, refetch } = useSuggestions({
    queryKey: ['suggestions'],
    enabled: isPanelOpen, // Only fetch when panel is open
  });

  const togglePanel = () => {
    setIsPanelOpen((prev) => !prev);
  };

  const closePanel = () => {
    setIsPanelOpen(false);
  };

  const handleRefresh = () => {
    refetch();
  };

  return (
    <>
      <div className="panel-section suggestions-toggle-section">
        <button
          id="toggleSuggestionsBtn"
          className="toggle-suggestions-btn"
          onClick={togglePanel}
        >
          💡 제안
        </button>
      </div>

      {/* Overlay for suggestions panel */}
      {isPanelOpen && (
        <div
          className="suggestions-overlay active"
          id="suggestionsOverlay"
          onClick={closePanel}
        ></div>
      )}

      <div
        className={`suggestions-panel ${isPanelOpen ? 'open' : ''}`}
        id="suggestionsPanel"
      >
        <div className="suggestions-header">
          <h2>AI 제안</h2>
          <button
            id="closeSuggestionsBtn"
            className="close-btn"
            onClick={closePanel}
          >
            ×
          </button>
        </div>
        <button
          id="refreshSuggestionsBtn"
          className="refresh-btn"
          onClick={handleRefresh}
        >
          🔄 새로고침
        </button>
        <div id="suggestionsList">
          {isLoading && <p>제안 로딩 중...</p>}
          {isError && <p>오류: {error?.message}</p>}
          {data?.suggestions.length === 0 && !isLoading && (
            <p>사용 가능한 제안이 없습니다.</p>
          )}
          {data?.suggestions.map((suggestion: any, index: number) => (
            <div key={index} className="suggestion-card">
              <p>{JSON.stringify(suggestion.content)}</p>{' '}
              {/* TODO: Render suggestion content properly */}
              {/* Add apply button here */}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
