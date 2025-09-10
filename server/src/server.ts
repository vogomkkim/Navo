import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fastify, { type RawServerDefault } from 'fastify';
import { errorHandler } from '@/lib/errorHandler';
import pinoLogger, { createRequestLogger } from '@/lib/logger';
import { analyticsController } from '@/modules/analytics/analytics.controller';
import { authController } from '@/modules/auth/auth.controller';
import { authenticateToken } from '@/modules/auth/auth.middleware';
import { eventsController } from '@/modules/events/events.controller';
import { healthController } from '@/modules/health/health.controller';
import { projectsController } from '@/modules/projects/projects.controller';
import { previewController } from '@/modules/preview/preview.controller';

// Fastify v4 인스턴스 생성
const app = fastify<RawServerDefault, IncomingMessage, ServerResponse>({
  logger: true,
  genReqId: (req) => {
    const header = req.headers['x-request-id'] as string | string[] | undefined;
    const fromHeader = Array.isArray(header) ? header[0] : header;
    return fromHeader ?? randomUUID();
  },
});

// 커스텀 로거 훅 등록
app.decorateRequest('_startTime', undefined);

app.addHook('onRequest', (req, _reply, done) => {
  const requestLogger = createRequestLogger(req.id as string);
  req._startTime = Date.now();
  requestLogger.info(
    {
      method: req.method,
      url: req.url,
      host: req.headers.host,
      requestId: req.id,
    },
    '요청 수신'
  );
  done();
});

// 에러 훅: 스택 포함 에러 상세 로깅
app.addHook('onError', (req, _reply, err, done) => {
  const requestLogger = createRequestLogger(req.id as string);
  requestLogger.error(
    {
      method: req.method,
      url: req.url,
      err,
    },
    '요청 처리 중 오류'
  );
  done();
});

// 응답 바디 프리뷰 로깅 (개발 환경 전용)
app.addHook('onSend', (req, reply, payload, done) => {
  if (process.env.NODE_ENV === 'development') {
    try {
      const requestLogger = createRequestLogger(req.id as string);
      const contentType = String(reply.getHeader('content-type') || '');
      const shouldLogBody =
        contentType.includes('application/json') ||
        contentType.startsWith('text/');

      let bodyPreview: string | undefined;
      if (shouldLogBody) {
        let text: string;
        if (Buffer.isBuffer(payload)) {
          text = payload.toString('utf8');
        } else if (typeof payload === 'string') {
          text = payload;
        } else {
          try {
            text = JSON.stringify(payload);
          } catch {
            text = String(payload);
          }
        }
        const maxLen = 2000;
        bodyPreview =
          text.length > maxLen
            ? text.slice(0, maxLen) +
              `... [추가 ${text.length - maxLen}자 생략]`
            : text;
      }

      requestLogger.info(
        {
          method: req.method,
          url: req.url,
          statusCode: reply.statusCode,
          contentType,
          body: bodyPreview ?? '[바디 로깅 제외]',
        },
        '응답 바디'
      );
    } catch {
      // 로깅 중 오류는 무시
    }
  }
  done(null, payload);
});

app.addHook('onResponse', (req, reply, done) => {
  const requestLogger = createRequestLogger(req.id as string);
  const start = req._startTime;
  const latencyMs = start ? Date.now() - start : undefined;
  requestLogger.info(
    {
      method: req.method,
      url: req.url,
      statusCode: reply.statusCode,
      requestId: req.id,
      latencyMs,
    },
    '요청 처리 완료'
  );
  done();
});

// Add a preHandler hook to gracefully handle empty JSON bodies
app.addHook('preHandler', (req, reply, done) => {
  if (req.headers['content-type'] === 'application/json' && !req.body) {
    req.body = {};
  }
  done();
});

// 전역 에러 핸들러 등록
errorHandler(app);

// 전역 인증 미들웨어 등록 (모듈 간 의존성 위반 방지)
app.decorate('authenticateToken', authenticateToken);

// 컨트롤러 등록
app.register((instance) => authController(instance), { prefix: '/api/auth' });
healthController(app);
app.register(eventsController, { prefix: '/api' });
projectsController(app);
analyticsController(app);
previewController(app); // Register the new preview controller

// 서버 시작 함수
const start = async () => {
  try {
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
    await app.listen({ port, host: '0.0.0.0' });
    pinoLogger.info(`서버가 ${port}번 포트에서 실행 중입니다.`);

    // 정상 기동 시 에러 로그 비우기
    try {
      const startupErrFile = path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        '..',
        'server.err'
      );
      fs.writeFileSync(startupErrFile, '');
    } catch {}

    // 개발 환경에서는 환경변수를 그대로 한 번 출력
    if (process.env.NODE_ENV === 'development') {
      pinoLogger.info({ env: process.env }, '개발 환경: 환경변수 전체 출력');
    }
  } catch (err) {
    pinoLogger.error(err, '서버 시작 실패');
    process.exit(1);
  }
};

start();

// 전역 예외/거부 처리: 파일로 즉시 기록
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const errFile = path.resolve(__dirname, '..', 'server.err');
const logUnhandled = (label: string, error: unknown) => {
  try {
    const now = new Date().toISOString();
    const payload =
      error instanceof Error
        ? `${error.name} ${error.message}\n${error.stack ?? ''}`
        : String(error);
    fs.appendFileSync(errFile, `${now} ${label} ${payload}\n`);
  } catch {
    // 무시
  }
};

process.on('uncaughtException', (error) => {
  logUnhandled('[uncaughtException]', error);
});

process.on('unhandledRejection', (reason) => {
  logUnhandled('[unhandledRejection]', reason as unknown);
});
