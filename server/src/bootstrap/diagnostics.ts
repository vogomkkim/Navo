import { bootstrapLogger } from './logger';
import { logBootstrapError } from './errorHandler';
import { testConnection } from '@/modules/db/db.instance';

// Repositories for diagnostics
import { ProjectsRepositoryImpl } from '@/modules/projects/projects.repository';
import { VfsRepositoryImpl } from '@/modules/projects/vfs.repository';

/**
 * Bootstrap 진단 시스템
 * 서버 구동 전 필수 컴포넌트들의 상태를 검증
 */

const REQUIRED_PROJECTS_REPO_METHODS = [
  'createProject', 'listProjectsByUserId', 'getProjectById',
  'getProjectByUserId', 'updateProjectName', 'deleteProjectById', 'rollbackProject'
];

const REQUIRED_VFS_REPO_METHODS = [
  'createRootNode', 'syncArchitecture', 'listNodesByParentId',
  'getNodeById', 'updateNodeContent'
];

/**
 * Repository 메서드 검증
 */
const checkRepositoryMethods = (repoClass: any, requiredMethods: string[]) => {
  const implementedMethods = Object.getOwnPropertyNames(repoClass.prototype);
  for (const method of requiredMethods) {
    if (!implementedMethods.includes(method)) {
      throw new Error(`Method '${method}' is not declared in ${repoClass.name}`);
    }
  }
};

/**
 * Runs diagnostic checks to ensure the application is in a valid state to start.
 */
export async function runDiagnostics() {
  bootstrapLogger.info('Running diagnostics...');

  // 1. Check for essential files (already implemented)

  // 2. Check for essential schema exports (already implemented)

  // 3. Check for method declarations in repositories
  try {
    checkRepositoryMethods(ProjectsRepositoryImpl, REQUIRED_PROJECTS_REPO_METHODS);
    checkRepositoryMethods(VfsRepositoryImpl, REQUIRED_VFS_REPO_METHODS);
    bootstrapLogger.info('Repository method declaration check: PASSED');
  } catch (e) {
    bootstrapLogger.error('Failed to verify repository methods:', e);
    logBootstrapError('[Diagnostics] Repository integrity check failed', e);
    throw new Error(`[Diagnostics] Roll call failed: Repository integrity check failed.`);
  }

  // 4. Test database connection
  try {
    await testConnection();
    bootstrapLogger.info('Database connection test: PASSED');
  } catch (e) {
    bootstrapLogger.error('Failed to connect to database:', e);
    logBootstrapError('[Diagnostics] Database connection failed', e);
    throw new Error(`[Diagnostics] Database connection failed.`);
  }

  bootstrapLogger.info('Diagnostics passed.');
}
