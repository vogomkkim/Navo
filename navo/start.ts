import app from './server.js';
import { testConnection } from './db/db.js';

const port = Number(process.env.PORT) || 3000;

async function startServer() {
  try {
    // 데이터베이스 연결 테스트
    await testConnection();

    // 서버 시작
    app.listen(port, () => {
      console.log(`[navo] listening on port ${port}`);
    });
  } catch (error) {
    console.error('[navo] Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
