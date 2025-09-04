import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bootstrapLogger } from './logger';

/**
 * Bootstrap 전용 에러 핸들러
 * 모듈 로드 시점의 에러를 캐치하고 server.err 파일에 기록
 */

// 에러 로그 파일 경로 (동적 결정)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// bootstrap 디렉토리에서 server 디렉토리로 올라가기
const errFile = path.resolve(__dirname, '..', '..', 'server.err');

/**
 * 초기 에러 로깅 함수
 *
 * 이 함수가 중요한 이유:
 * 1. 모듈 로드 시점의 에러는 logger.ts가 아직 로드되지 않아서 server.err에 기록되지 않음
 * 2. bootstrap.ts에서 직접 파일에 기록하여 모든 초기 에러를 캐치
 * 3. 서버 구동 전 진단 에러도 모두 기록 가능
 *
 * 변경하지 말아야 할 이유:
 * - 이 함수를 제거하면 모듈 로드 에러가 server.err에 기록되지 않음
 * - 서버 구동 실패 원인을 파악할 수 없게 됨
 * - bootstrap.ts의 존재 의미가 없어짐
 */
export const logBootstrapError = (label: string, error: unknown) => {
  try {
    const now = new Date().toISOString();
    const payload =
      error instanceof Error
        ? `${error.name} ${error.message}\n${error.stack ?? ''}`
        : String(error);
    fs.appendFileSync(errFile, `${now} [Bootstrap] ${label} ${payload}\n`);
  } catch {
    // 무시
  }
};

/**
 * 전역 에러 핸들러 등록 (bootstrap 단계에서)
 *
 * 이 핸들러들이 중요한 이유:
 * 1. 모듈 로드 시점의 uncaughtException을 캐치
 * 2. import 과정에서 발생하는 에러를 server.err에 기록
 * 3. logger.ts 로드 전에도 에러 로깅 가능
 *
 * 변경하지 말아야 할 이유:
 * - 이 핸들러들을 제거하면 초기 에러가 server.err에 기록되지 않음
 * - 서버 구동 실패 시 원인 파악이 불가능
 */
export const setupBootstrapErrorHandlers = () => {
  process.on('uncaughtException', (error) => {
    logBootstrapError('[uncaughtException]', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logBootstrapError('[unhandledRejection]', reason as unknown);
    process.exit(1);
  });
};
