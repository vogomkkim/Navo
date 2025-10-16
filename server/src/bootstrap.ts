import { bootstrapLogger } from './bootstrap/logger';
import { setupBootstrapErrorHandlers, logBootstrapError } from './bootstrap/errorHandler';
import { runDiagnostics } from './bootstrap/diagnostics';
import { buildApp } from './server'; // Import the buildApp function

/**
 * Bootstrap 시스템 초기화
 */
const initializeBootstrap = () => {
  setupBootstrapErrorHandlers();
  bootstrapLogger.info('Bootstrap system initialized');
};

/**
 * Starts the application with diagnostics.
 */
export async function startServer() {
  try {
    initializeBootstrap();
    await runDiagnostics();
    bootstrapLogger.info('서버 시작 준비 완료');

    const app = await buildApp();

    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
    await app.listen({ port });

  } catch (err) {
    bootstrapLogger.error('진단 실패', err);
    logBootstrapError('[Bootstrap] 진단 실패', err);
    process.exit(1);
  }
}

// 서버 시작
startServer();
