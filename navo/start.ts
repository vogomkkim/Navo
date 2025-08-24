import app from './server.js';
import logger from './core/logger.js';
import { testConnection } from './db/db.js';

const port = Number(process.env.PORT) || 3000;

async function startServer() {
  try {
    // 데이터베이스 연결 테스트
    await testConnection();

    // 서버 시작
    app.listen(port, () => {
      logger.info('[navo] listening on port', { port });
    });
  } catch (error) {
    logger.error('[navo] Failed to start server', error);
    process.exit(1);
  }
}

startServer();
