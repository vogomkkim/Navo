import fastify from 'fastify';
import { errorHandler } from './lib/errorHandler';
import logger, { createRequestLogger } from './lib/logger';

import { authController } from './modules/auth/auth.controller';
import { healthController } from './modules/health/health.controller';
import { staticController } from './modules/static/static.controller';
import { aiController } from './modules/ai/ai.controller';
import eventRoutes from './modules/events/events.controller';

// Fastify 인스턴스 생성
const app = fastify({
  logger: false, // 커스텀 로거를 사용하므로 기본 로거는 비활성화
  genReqId: (req) => req.headers['x-request-id'] || createRequestLogger().bindings().requestId,
});

// 커스텀 로거 훅 등록
app.addHook('onRequest', (req, reply, done) => {
  const requestLogger = createRequestLogger(req.id as string);
  requestLogger.info({ req }, `요청 수신: ${req.method} ${req.url}`);
  done();
});

app.addHook('onResponse', (req, reply, done) => {
  const requestLogger = createRequestLogger(req.id as string);
  requestLogger.info({ res: reply }, `요청 처리 완료: ${req.method} ${req.url} - ${reply.statusCode}`);
  done();
});

// 전역 에러 핸들러 등록
errorHandler(app);

// 컨트롤러 등록
authController(app);
healthController(app);
staticController(app);
aiController(app);
app.register(eventRoutes, { prefix: '/api' });

// 서버 시작 함수
const start = async () => {
  try {
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
    await app.listen({ port, host: '0.0.0.0' });
    logger.info(`서버가 ${port}번 포트에서 실행 중입니다.`);
  } catch (err) {
    logger.error(err, '서버 시작 실패');
    process.exit(1);
  }
};

start();
