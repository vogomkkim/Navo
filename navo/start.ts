import "dotenv/config";
import app from "./server.js";
import logger from "./core/logger.js";
import { testConnection } from "./db/db.js";

const port = Number(process.env.PORT) || 3000;

async function startServer() {
  try {
    console.log("🚀 서버 시작 프로세스 시작...");

    // 데이터베이스 연결 테스트
    console.log("📊 데이터베이스 연결 테스트 중...");
    await testConnection();
    console.log("✅ 데이터베이스 연결 성공");

    // 서버 시작
    console.log("🌐 Fastify 서버 시작 중...");
    console.log("📍 포트:", port);
    console.log("🏠 호스트:", "127.0.0.1");

    app.listen({ port, host: "127.0.0.1" }, (err) => {
      if (err) {
        console.error("❌ 서버 시작 실패:", err);
        process.exit(1);
      }
      logger.info(`Server started on port ${port} and host 127.0.0.1`);
      console.log("🎉 서버 시작 완료!");
    });
  } catch (error) {
    console.error("💥 서버 시작 중 에러 발생:", error);
    logger.error("Failed to start server", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

startServer();
