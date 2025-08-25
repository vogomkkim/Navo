type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// 환경 변수로 로그 레벨 제어
const LOG_LEVEL = (process.env.LOG_LEVEL || 'info') as LogLevel;
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[LOG_LEVEL];
}

function formatMessage(
  level: LogLevel,
  message: string,
  meta?: unknown
): string {
  const timestamp = new Date().toISOString();
  const levelText = level.toUpperCase();

  let output = `[${timestamp}] [${levelText}] ${message}`;

  // meta가 있으면 간단하게 추가
  if (meta !== undefined) {
    if (typeof meta === 'object' && meta !== null) {
      // 중요한 정보만 추출
      const simpleMeta = extractImportantInfo(meta);
      if (simpleMeta) {
        output += ` | ${simpleMeta}`;
      }
    } else {
      output += ` | ${String(meta)}`;
    }
  }

  return output;
}

// 중요한 정보만 추출하는 함수
function extractImportantInfo(obj: any): string | null {
  if (!obj || typeof obj !== 'object') return null;

  // 에러 객체인 경우
  if (obj.error || obj.message) {
    return obj.error || obj.message;
  }

  // 상태 정보인 경우
  if (obj.status || obj.statusCode) {
    return `Status: ${obj.status || obj.statusCode}`;
  }

  // 간단한 정보만 반환
  const keys = Object.keys(obj);
  if (keys.length <= 3) {
    return keys.map((key) => `${key}: ${obj[key]}`).join(', ');
  }

  return null;
}

export const logger = {
  debug(message: string, meta?: unknown) {
    if (shouldLog('debug') && process.env.NODE_ENV !== 'production') {
      console.debug(formatMessage('debug', message, meta));
    }
  },
  info(message: string, meta?: unknown) {
    if (shouldLog('info')) {
      console.info(formatMessage('info', message, meta));
    }
  },
  warn(message: string, meta?: unknown) {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', message, meta));
    }
  },
  error(message: string, meta?: unknown) {
    if (shouldLog('error')) {
      console.error(formatMessage('error', message, meta));
    }
  },
};

export default logger;
