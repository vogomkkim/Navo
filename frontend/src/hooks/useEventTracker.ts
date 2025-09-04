'use client';

import { useCallback, useEffect, useRef } from 'react';

import { useTrackEvents } from '@/lib/api';

interface EventData {
  type: string;
  [key: string]: any; // Allow any other properties
}

const FLUSH_INTERVAL = 2000; // 2 seconds

export function useEventTracker() {
  const eventQueue = useRef<EventData[]>([]);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { mutate: sendEvents } = useTrackEvents();

  const flushEvents = useCallback(() => {
    if (eventQueue.current.length === 0) {
      flushTimer.current = null;
      return;
    }

    const batch = [...eventQueue.current];
    eventQueue.current = []; // Clear the queue immediately
    flushTimer.current = null;

    sendEvents(batch, {
      onError: (err) => {
        console.error('Failed to send events:', err);
        // Optionally, re-add events to queue for retry or log to persistent storage
      },
    });
  }, [sendEvents]);

  const track = useCallback(
    (event: EventData) => {
      eventQueue.current.push({ ...event, ts: Date.now() });
      if (!flushTimer.current) {
        flushTimer.current = setTimeout(flushEvents, FLUSH_INTERVAL);
      }
    },
    [flushEvents],
  );

  // Clear any pending timer on unmount
  useEffect(() => {
    return () => {
      if (flushTimer.current) {
        clearTimeout(flushTimer.current);
      }
    };
  }, []);

  return { track };
}
