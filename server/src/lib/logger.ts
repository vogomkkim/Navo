// Simple console-backed logger to replace Pino while preserving the API shape
// Uses console.log/warn/error consistently, writes to log files, and supports child() with bindings

import { appendFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

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
  const fileDir = resolve(fileURLToPath(new URL(".", import.meta.url)));
  // Place logs under the server directory, regardless of CWD or build output path
  const LOG_FILE = resolve(fileDir, "..", "..", "..", "server", "server.log");
  const ERR_FILE = resolve(fileDir, "..", "..", "..", "server", "server.err");

  const toPlain = (val: unknown): unknown => {
    if (val instanceof Error) {
      return { name: val.name, message: val.message, stack: val.stack };
    }
    return val;
  };

  const formatTs = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${y}-${m}-${day} ${hh}:${mm}:${ss}`;
  };

  type LogEntry = {
    ts: string;
    level: "info" | "warn" | "error" | "debug";
    msg?: string;
    data?: unknown;
    extras?: unknown[];
    bindings?: Record<string, unknown>;
  };

  const buildEntry = (
    level: LogEntry["level"],
    args: unknown[],
    bindingsForEntry: Record<string, unknown>
  ): LogEntry => {
    const ts = formatTs(new Date());
    const levelStr = level; // JSONL에서는 고정폭 패딩 불필요
    let msg: string | undefined;
    let data: unknown | undefined;
    const extras: unknown[] = [];

    if (args.length === 0) {
      // noop
    } else if (args.length === 1) {
      if (typeof args[0] === "string") msg = args[0] as string;
      else data = toPlain(args[0]);
    } else {
      const a0 = args[0];
      const a1 = args[1];
      if (typeof a0 === "object" && a0 !== null && typeof a1 === "string") {
        data = toPlain(a0);
        msg = a1 as string;
      } else if (typeof a0 === "string") {
        msg = a0 as string;
        data = toPlain(a1);
      } else {
        data = toPlain(a0);
        msg = String(a1);
      }
      if (args.length > 2) {
        for (let i = 2; i < args.length; i++) extras.push(toPlain(args[i]));
      }
    }

    return {
      ts,
      level: levelStr,
      msg,
      data:
        data && Object.keys(bindingsForEntry).length > 0
          ? { ...(data as Record<string, unknown>), ...bindingsForEntry }
          : data ??
            (Object.keys(bindingsForEntry).length > 0
              ? { ...bindingsForEntry }
              : undefined),
      extras: extras.length > 0 ? extras : undefined,
      bindings:
        Object.keys(bindingsForEntry).length > 0
          ? { ...bindingsForEntry }
          : undefined,
    };
  };

  const writeJsonLine = (
    filePath: string,
    level: LogEntry["level"],
    args: unknown[],
    bindingsForEntry: Record<string, unknown>
  ) => {
    try {
      const entry = buildEntry(level, args, bindingsForEntry);
      appendFileSync(filePath, JSON.stringify(entry) + "\n");
    } catch (error) {
      console.error("[Debug] Write failed:", error);
    }
  };
  const mergeBindings = (args: unknown[]): unknown[] => {
    if (args.length > 0 && typeof args[0] === "object" && args[0] !== null) {
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
      console.log("[Navo]", ...merged);
      writeJsonLine(LOG_FILE, "info", merged, bindings);
    },
    warn: (...args: unknown[]) => {
      const merged = mergeBindings(args);
      console.warn("[Navo]", ...merged);
      writeJsonLine(ERR_FILE, "warn", merged, bindings);
    },
    error: (...args: unknown[]) => {
      const merged = mergeBindings(args);
      console.error("[Navo]", ...merged);
      writeJsonLine(ERR_FILE, "error", merged, bindings);
    },
    debug: (...args: unknown[]) => {
      const merged = mergeBindings(args);
      console.log("[Navo]", ...merged);
      writeJsonLine(LOG_FILE, "debug", merged, bindings);
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
// Note: keep logger focused; do not re-export helper modules from here
