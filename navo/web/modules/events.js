import { api } from './api.js';

let eventQueue = [];
let flushTimer = null;

export function track(event) {
  eventQueue.push({ ...event, ts: Date.now() });
  if (!flushTimer) {
    flushTimer = setTimeout(flushEvents, 2000);
  }
}

async function flushEvents() {
  const batch = eventQueue.splice(0, eventQueue.length);
  flushTimer = null;
  if (batch.length === 0) return;
  try {
    await api.trackEvents(batch);
  } catch (_) {
    // ignore errors for mock
  }
}

export function setupGlobalErrorHandling() {
    window.addEventListener('error', async (event) => {
        console.log('🚨 JavaScript 에러 캐치:', {
          message: event.error?.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack
        });
      
        try {
          await api.logError({
            type: 'javascript_error',
            message: event.error?.message || 'Unknown JavaScript error',
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            stack: event.error?.stack,
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
          });
        } catch (e) {
          console.log('❌ 에러 로깅 실패:', e);
        }
      });
      
      window.addEventListener('unhandledrejection', async (event) => {
        console.log('🚨 Promise 에러 캐치:', {
          reason: event.reason,
          promise: event.promise
        });
      
        try {
            await api.logError({
                type: 'promise_error',
                message: event.reason?.message || 'Unknown Promise error',
                stack: event.reason?.stack,
                url: window.location.href,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
            });
        } catch (e) {
          console.log('❌ 에러 로깅 실패:', e);
        }
      });
}
