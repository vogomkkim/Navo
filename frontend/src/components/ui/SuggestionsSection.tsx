'use client';

import { useState } from 'react';
import { useSuggestions } from '@/lib/api';

export function SuggestionsSection() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const { data, isLoading, isError, error, refetch } = useSuggestions({
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
        <button id="toggleSuggestionsBtn" className="toggle-suggestions-btn" onClick={togglePanel}>
          💡 Suggestions
        </button>
      </div>

      {/* Overlay for suggestions panel */}
      {isPanelOpen && (
        <div className="suggestions-overlay active" id="suggestionsOverlay" onClick={closePanel}></div>
      )}

      <div className={`suggestions-panel ${isPanelOpen ? 'open' : ''}`} id="suggestionsPanel">
        <div className="suggestions-header">
          <h2>AI Suggestions</h2>
          <button id="closeSuggestionsBtn" className="close-btn" onClick={closePanel}>×</button>
        </div>
        <button id="refreshSuggestionsBtn" className="refresh-btn" onClick={handleRefresh}>
          🔄 Refresh
        </button>
        <div id="suggestionsList">
          {isLoading && <p>Loading suggestions...</p>}
          {isError && <p>Error: {error?.message}</p>}
          {data?.suggestions.length === 0 && !isLoading && <p>No suggestions available.</p>}
          {data?.suggestions.map((suggestion: any, index: number) => (
            <div key={index} className="suggestion-card">
              <p>{JSON.stringify(suggestion.content)}</p> {/* TODO: Render suggestion content properly */}
              {/* Add apply button here */}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}