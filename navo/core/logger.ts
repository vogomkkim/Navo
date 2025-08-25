type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function formatMessage(
  level: LogLevel,
  message: unknown,
  meta?: unknown
): string {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] [${level.toUpperCase()}]`;
  try {
    const msg = typeof message === 'string' ? message : JSON.stringify(message);

    // meta 객체를 더 자세하게 포맷팅
    let metaStr = '';
    if (meta !== undefined) {
      if (typeof meta === 'object' && meta !== null) {
        try {
          metaStr = ` ${JSON.stringify(meta, null, 2)}`;
        } catch {
          metaStr = ` ${String(meta)}`;
        }
      } else {
        metaStr = ` ${String(meta)}`;
      }
    }

    return `${base} ${msg}${metaStr}`;
  } catch {
    return `${base} ${String(message)}`;
  }
}

export const logger = {
  debug(message: unknown, meta?: unknown) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(formatMessage('debug', message, meta));
    }
  },
  info(message: unknown, meta?: unknown) {
    console.info(formatMessage('info', message, meta));
  },
  warn(message: unknown, meta?: unknown) {
    console.warn(formatMessage('warn', message, meta));
  },
  error(message: unknown, meta?: unknown) {
    console.error(formatMessage('error', message, meta));
  },
};

export default logger;
