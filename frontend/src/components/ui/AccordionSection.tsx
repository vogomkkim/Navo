'use client';

import { ReactNode, useState } from 'react';

interface AccordionSectionProps {
  title: string;
  children: ReactNode;
}

export function AccordionSection({ title, children }: AccordionSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(false); // Default to not collapsed

  const toggleCollapse = () => {
    setIsCollapsed((prev) => !prev);
  };

  // Check if mobile (simplified for now, can use a custom hook for better responsiveness)
  const isMobile = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(max-width: 768px)').matches;

  return (
    <div
      className={`panel-section ${isMobile() && isCollapsed ? 'collapsed' : ''}`}
    >
      <h2 onClick={isMobile() ? toggleCollapse : undefined}>
        {title}
        {isMobile() && (
          <span>{isCollapsed ? '▼' : '▲'}</span> // Simple indicator
        )}
      </h2>
      {!isMobile() || !isCollapsed ? children : null}
    </div>
  );
}
