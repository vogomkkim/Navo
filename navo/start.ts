import app from './server.js';
import logger from './core/logger.js';
import { testConnection } from './db/db.js';

const port = Number(process.env.PORT) || 3000;

async function startServer() {
  try {
    // 환경 변수 및 시스템 정보 로깅
    logger.info('[navo] Starting server with configuration', {
      port,
      nodeEnv: process.env.NODE_ENV || 'development',
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      databaseUrlLength: process.env.DATABASE_URL?.length || 0,
      platform: process.platform,
      nodeVersion: process.version,
      cwd: process.cwd(),
    });

    // 데이터베이스 연결 테스트
    logger.info('[navo] Testing database connection...');
    await testConnection();

    // 서버 시작
    app.listen(port, () => {
      logger.info('[navo] Server started successfully', {
        port,
        timestamp: new Date().toISOString(),
        pid: process.pid,
      });
    });
  } catch (error) {
    logger.error('[navo] Failed to start server', {
      error: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code,
      stack: error instanceof Error ? error.stack : undefined,
      fullError: error,
    });
    process.exit(1);
  }
}

startServer();
