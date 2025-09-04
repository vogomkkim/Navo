import { FastifyInstance } from 'fastify';
import pinoLogger from '@/lib/logger';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Repositories for diagnostics
import { ProjectsRepositoryImpl } from '@/modules/projects/projects.repository';
import { VfsRepositoryImpl } from '@/modules/projects/vfs.repository';
import { testConnection } from '@/modules/db/db.instance';

// Import the server app
import './server';

// ... (Controller imports)

const REQUIRED_PROJECTS_REPO_METHODS = [
  'createProject', 'listProjectsByUserId', 'getProjectById',
  'getProjectByUserId', 'updateProjectName', 'deleteProjectById', 'rollbackProject'
];

const REQUIRED_VFS_REPO_METHODS = [
  'createRootNode', 'syncArchitecture', 'listNodesByParentId',
  'getNodeById', 'updateNodeContent'
];

// 에러 로그 파일 경로
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const errFile = path.resolve(__dirname, '..', 'server.err');

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
const logBootstrapError = (label: string, error: unknown) => {
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
process.on('uncaughtException', (error) => {
  logBootstrapError('[uncaughtException]', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logBootstrapError('[unhandledRejection]', reason as unknown);
  process.exit(1);
});

/**
 * Runs diagnostic checks to ensure the application is in a valid state to start.
 */
async function runDiagnostics() {
  console.log('[Bootstrap] Running diagnostics...');

  // 1. Check for essential files (already implemented)

  // 2. Check for essential schema exports (already implemented)

  // 3. Check for method declarations in repositories
  const checkMethods = (repoClass: any, requiredMethods: string[]) => {
    const implementedMethods = Object.getOwnPropertyNames(repoClass.prototype);
    for (const method of requiredMethods) {
      if (!implementedMethods.includes(method)) {
        throw new Error(`Method '${method}' is not declared in ${repoClass.name}`);
      }
    }
  };

  try {
    checkMethods(ProjectsRepositoryImpl, REQUIRED_PROJECTS_REPO_METHODS);
    checkMethods(VfsRepositoryImpl, REQUIRED_VFS_REPO_METHODS);
    console.log('[Bootstrap] Repository method declaration check: PASSED');
  } catch (e) {
    console.error('[Diagnostics] Failed to verify repository methods:', e);
    logBootstrapError('[Diagnostics] Repository integrity check failed', e);
    throw new Error(`[Diagnostics] Roll call failed: Repository integrity check failed.`);
  }

  // 4. Test database connection
  try {
    await testConnection();
    console.log('[Bootstrap] Database connection test: PASSED');
  } catch (e) {
    console.error('[Diagnostics] Failed to connect to database:', e);
    logBootstrapError('[Diagnostics] Database connection failed', e);
    throw new Error(`[Diagnostics] Database connection failed.`);
  }

  console.log('[Bootstrap] Diagnostics passed.');
}

/**
 * Starts the application with diagnostics.
 */
export async function startServer() {
  try {
    await runDiagnostics();
    pinoLogger.info('[Bootstrap] 서버 시작 준비 완료');
  } catch (err) {
    pinoLogger.error(err, '[Bootstrap] 진단 실패');
    logBootstrapError('[Bootstrap] 진단 실패', err);
    process.exit(1);
  }
}

// 서버 시작
startServer();
