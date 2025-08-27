'use client';

import { useState, ReactNode } from 'react';

interface PanelProps {
  children: ReactNode;
}

export function Panel({ children }: PanelProps) {
  const [isOpen, setIsOpen] = useState(false); // State to manage panel visibility

  const togglePanel = () => {
    setIsOpen((prev) => !prev);
  };

  const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

  const closeMobilePanel = () => {
    setIsOpen(false);
  };

  return (
    <>
      <button id="togglePanelBtn" onClick={togglePanel}>
        Toggle Panel
      </button>
      {isMobile() && isOpen && (
        <div
          className="panel-overlay active"
          id="panelOverlay"
          onClick={closeMobilePanel}
        ></div>
      )}
      <aside
        className={`panel ${isOpen ? 'mobile-open' : ''}`}
        aria-label="Side Panel"
      >
        {children}
      </aside>
    </>
  );
}
