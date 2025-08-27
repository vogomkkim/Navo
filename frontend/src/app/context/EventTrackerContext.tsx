'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useEventTracker } from '@/hooks/useEventTracker';

interface EventTrackerContextType {
  track: (event: { type: string; [key: string]: any }) => void;
}

const EventTrackerContext = createContext<EventTrackerContextType | undefined>(
  undefined
);

export function EventTrackerProvider({ children }: { children: ReactNode }) {
  const { track } = useEventTracker();

  return (
    <EventTrackerContext.Provider value={{ track }}>
      {children}
    </EventTrackerContext.Provider>
  );
}

export function useEventTrackerContext() {
  const context = useContext(EventTrackerContext);
  if (context === undefined) {
    throw new Error(
      'useEventTrackerContext must be used within an EventTrackerProvider'
    );
  }
  return context;
}
