import pino from 'pino';
import { randomUUID } from 'crypto';

const isDevelopment = process.env.NODE_ENV === 'development';

// 기본 로거 설정
const logger = pino({
  level: isDevelopment ? 'debug' : 'info',
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

// 요청별 컨텍스트를 포함하는 자식 로거 생성
export const createRequestLogger = (requestId?: string) => {
  return logger.child({ requestId: requestId || randomUUID() });
};

export default logger;
