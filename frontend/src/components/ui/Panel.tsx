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

  return (
    <>
      <button id="togglePanelBtn" onClick={togglePanel}>Toggle Panel</button>
      <aside className={`panel ${isOpen ? 'mobile-open' : ''}`} aria-label="Side Panel">
        {children}
      </aside>
    </>
  );
}