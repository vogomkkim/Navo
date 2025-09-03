// Simple console-backed logger to replace Pino while preserving the API shape
// Uses console.log/warn/error consistently, and supports child() with bindings

export type SimpleLogger = {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
  child: (bindings?: Record<string, unknown>) => SimpleLogger;
  bindings: () => Record<string, unknown>;
};

function createConsoleLogger(bindings: Record<string, unknown> = {}): SimpleLogger {
  const mergeBindings = (args: unknown[]): unknown[] => {
    if (args.length > 0 && typeof args[0] === 'object' && args[0] !== null) {
      return [{ ...(args[0] as Record<string, unknown>), ...bindings }, ...args.slice(1)];
    }
    if (Object.keys(bindings).length > 0) {
      return [bindings, ...args];
    }
    return args;
  };

  return {
    info: (...args: unknown[]) => console.log(...mergeBindings(args)),
    warn: (...args: unknown[]) => console.warn(...mergeBindings(args)),
    error: (...args: unknown[]) => console.error(...mergeBindings(args)),
    debug: (...args: unknown[]) => console.log(...mergeBindings(args)),
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
