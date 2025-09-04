// Simple console-backed logger to replace Pino while preserving the API shape
// Uses console.log/warn/error consistently, writes to log files, and supports child() with bindings

import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export type SimpleLogger = {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
  child: (bindings?: Record<string, unknown>) => SimpleLogger;
  bindings: () => Record<string, unknown>;
};

function createConsoleLogger(
  bindings: Record<string, unknown> = {}
): SimpleLogger {
  const fileDir = resolve(fileURLToPath(new URL('.', import.meta.url)));
  // Place logs under the server directory, regardless of CWD or build output path
  const LOG_FILE = resolve(fileDir, '..', '..', 'server.log');
  const ERR_FILE = resolve(fileDir, '..', '..', 'server.err');

  const serializeValue = (value: unknown): string => {
    if (value instanceof Error) {
      return JSON.stringify({
        name: value.name,
        message: value.message,
        stack: value.stack,
      });
    }
    if (typeof value === 'object' && value !== null) {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }
    return String(value);
  };

  const writeLine = (filePath: string, args: unknown[]) => {
    try {
      const now = new Date().toISOString();
      const line = [now, ...args.map(serializeValue)].join(' ') + '\n';
      appendFileSync(filePath, line);
    } catch {
      // 파일 기록 실패는 무시 (콘솔 출력은 그대로 수행)
    }
  };
  const mergeBindings = (args: unknown[]): unknown[] => {
    if (args.length > 0 && typeof args[0] === 'object' && args[0] !== null) {
      return [
        { ...(args[0] as Record<string, unknown>), ...bindings },
        ...args.slice(1),
      ];
    }
    if (Object.keys(bindings).length > 0) {
      return [bindings, ...args];
    }
    return args;
  };

  return {
    info: (...args: unknown[]) => {
      const merged = mergeBindings(args);
      console.log(...merged);
      writeLine(LOG_FILE, merged);
    },
    warn: (...args: unknown[]) => {
      const merged = mergeBindings(args);
      console.warn(...merged);
      writeLine(ERR_FILE, merged);
    },
    error: (...args: unknown[]) => {
      const merged = mergeBindings(args);
      console.error(...merged);
      writeLine(ERR_FILE, merged);
    },
    debug: (...args: unknown[]) => {
      const merged = mergeBindings(args);
      console.log(...merged);
      writeLine(LOG_FILE, merged);
    },
    child: (childBindings: Record<string, unknown> = {}) =>
      createConsoleLogger({ ...bindings, ...childBindings }),
    bindings: () => ({ ...bindings }),
  };
}

const logger: SimpleLogger = createConsoleLogger();

export const createRequestLogger = (requestId?: string) => {
  return requestId ? logger.child({ requestId }) : logger.child();
};

export default logger;
