'use client';

import { useEffect } from 'react';

import { useLogError } from '@/lib/api';

export function useGlobalErrorLogger() {
  const { mutate: logError } = useLogError();

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.log('🚨 JavaScript 에러 캐치:', {
        message: event.error?.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
      });

      logError({
        type: 'javascript_error',
        message: event.error?.message || 'Unknown JavaScript error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      console.log('🚨 Promise 에러 캐치:', {
        reason: event.reason,
        promise: event.promise,
      });

      logError({
        type: 'promise_error',
        message: event.reason?.message || 'Unknown Promise error',
        stack: event.reason?.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        reason: event.reason,
        promise: event.promise,
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, [logError]);
}
