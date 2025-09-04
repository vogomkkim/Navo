/**
 * Bootstrap Entry Point
 * 서버 구동 전 진단 및 초기화를 담당하는 진입점
 */

// Import the server app
import './server';

// Bootstrap modules
import { bootstrapLogger } from './bootstrap/logger';
import { setupBootstrapErrorHandlers, logBootstrapError } from './bootstrap/errorHandler';
import { runDiagnostics } from './bootstrap/diagnostics';

/**
 * Bootstrap 시스템 초기화
 */
const initializeBootstrap = () => {
  // 전역 에러 핸들러 설정
  setupBootstrapErrorHandlers();

  bootstrapLogger.info('Bootstrap system initialized');
};

/**
 * Starts the application with diagnostics.
 */
export async function startServer() {
  try {
    // Bootstrap 시스템 초기화
    initializeBootstrap();

    // 진단 실행
    await runDiagnostics();

    bootstrapLogger.info('서버 시작 준비 완료');
  } catch (err) {
    bootstrapLogger.error('진단 실패', err);
    logBootstrapError('[Bootstrap] 진단 실패', err);
    process.exit(1);
  }
}

// 서버 시작
startServer();
