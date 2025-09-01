import 'dotenv/config';
import app from './server.js';
import logger from './core/logger.js';
import { testConnection } from './db/db.js';

const port = Number(process.env.PORT) || 3001;
const host = process.env.HOST || '0.0.0.0';

async function startServer() {
  try {
    // 서버 시작
    logger.info('🌐 Fastify 서버 시작 중...');

    // 데이터베이스 연결 테스트
    await testConnection();
    logger.info('✅ 데이터베이스 연결 성공');

    app.listen({ port, host }, (err) => {
      if (err) {
        logger.error('❌ 서버 시작 실패:', err);
        process.exit(1);
      }
      logger.info(`🚀 서버 시작 완료! 포트: ${port}, 호스트: ${host}`);
    });
  } catch (error) {
    logger.error('💥 서버 시작 중 에러 발생:', error);
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

startServer();
