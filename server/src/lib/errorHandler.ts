import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createRequestLogger } from './logger';

// 표준 에러 구조 정의
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly isOperational: boolean;

  constructor(statusCode: number, errorCode: string, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this);
  }
}

// Fastify를 위한 전역 에러 핸들링 미들웨어
export const errorHandler = (app: FastifyInstance) => {
  app.setErrorHandler((error: Error | AppError, request: FastifyRequest, reply: FastifyReply) => {
    const logger = createRequestLogger(request.id as string);

    if (error instanceof AppError && error.isOperational) {
      // 예측 가능한 운영상의 에러 처리
      logger.warn({ err: error }, `처리 가능한 에러 발생: ${error.message}`);
      reply.status(error.statusCode).send({ 
        errorCode: error.errorCode,
        message: error.message 
      });
    } else {
      // 예측하지 못한 에러 처리
      logger.error({ err: error }, `예상치 못한 에러 발생: ${error.message}`);
      // 운영 환경에서는 상세한 에러 메시지를 클라이언트에 노출하지 않음
      reply.status(500).send({ 
        errorCode: 'INTERNAL_SERVER_ERROR',
        message: '서버에서 예상치 못한 오류가 발생했습니다.' 
      });
    }
  });
};
