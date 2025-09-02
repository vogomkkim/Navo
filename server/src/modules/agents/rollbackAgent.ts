/**
 * Rollback Agent
 *
 * 코드 수정 실패 시 이전 상태로 자동 복원하는 에이전트
 */

import {
  BaseAgent,
  MasterDeveloperAgent,
  ErrorContext,
  ResolutionResult,
  CodeChange,
} from './core/masterDeveloper.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export class RollbackAgent extends BaseAgent {
  private backupDir: string;
  private rollbackHistory: Map<string, string[]> = new Map(); // 파일별 롤백 히스토리

  constructor() {
    super('RollbackAgent', 4); // Test Runner 다음 우선순위

    // 백업 디렉토리 설정
    this.backupDir = path.join(process.cwd(), '.backups');
  }

  /**
   * 이 에이전트가 처리할 수 있는 에러인지 확인
   * Rollback Agent는 복구가 필요한 모든 에러를 처리
   */
  canHandle(error: Error): boolean {
    return true; // Orchestrator will pass relevant changes for rollback
  }

  /**
   * 롤백 실행
   */
  async execute(
    error: Error,
    context: ErrorContext,
    changesToRollback?: CodeChange[] // Added changesToRollback as input
  ): Promise<ResolutionResult> {
    try {
      this.logSuccess(context, '롤백 프로세스 시작', { error: error.message });

      const rollbackList: CodeChange[] = changesToRollback ?? [];

      if (rollbackList.length === 0) {
        return {
          success: true,
          changes: [],
          executionTime: 0,
          nextSteps: [
            '롤백이 필요한 변경사항이 없습니다.',
            '애플리케이션이 정상 상태입니다',
          ],
        };
      }

      // 롤백 실행
      const { result: rollbackResults, executionTime } =
        await this.measureExecutionTime(() =>
          this.performRollback(rollbackList)
        );

      const successfulRollbacks = rollbackResults.filter((r) => r.success);
      const failedRollbacks = rollbackResults.filter((r) => !r.success);

      this.logSuccess(context, '롤백 프로세스 완료', {
        totalFiles: rollbackList.length,
        successful: successfulRollbacks.length,
        failed: failedRollbacks.length,
        executionTime,
      });

      if (failedRollbacks.length > 0) {
        return {
          success: false,
          changes: [],
          executionTime,
          errorMessage: `${failedRollbacks.length}개 파일의 롤백이 실패했습니다.`,
          nextSteps: [
            '수동 복구가 필요합니다',
            '백업 파일을 확인하여 직접 복원하세요',
            '시스템 관리자에게 문의하세요',
          ],
        };
      }

      return {
        success: true,
        changes: successfulRollbacks.map((r) => ({
          file: r.filePath,
          action: 'rollback',
          content: `롤백 완료: ${r.backupPath}`,
          reason: '코드 수정 실패로 인한 자동 복구',
        })),
        executionTime,
        nextSteps: [
          '✅ 모든 파일이 성공적으로 롤백되었습니다',
          '애플리케이션이 이전 안정 상태로 복원되었습니다',
          '새로운 에러 해결 방법을 시도해보세요',
        ],
      };
    } catch (e) {
      this.logError(error, context, '롤백 프로세스 실패');

      return {
        success: false,
        changes: [],
        executionTime: 0,
        errorMessage: `롤백 프로세스 실패: ${e instanceof Error ? e.message : String(e)}`,
        nextSteps: [
          '긴급 수동 복구가 필요합니다',
          '백업 디렉토리를 확인하세요',
          '시스템 관리자에게 즉시 문의하세요',
        ],
      };
    }
  }

  /**
   * 롤백 실행
   */
  private async performRollback(changesToRollback: CodeChange[]): Promise<
    Array<{
      success: boolean;
      filePath: string;
      backupPath?: string;
      error?: string;
    }>
  > {
    const results: Array<{
      success: boolean;
      filePath: string;
      backupPath?: string;
      error?: string;
    }> = [];

    for (const change of changesToRollback) {
      try {
        const result = await this.rollbackSingleFile(change);
        results.push(result);
      } catch (e) {
        results.push({
          success: false,
          filePath: change.file,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    return results;
  }

  /**
   * 단일 파일 롤백
   */
  private async rollbackSingleFile(change: CodeChange): Promise<{
    success: boolean;
    filePath: string;
    backupPath?: string;
    error?: string;
  }> {
    try {
      const filePath = path.resolve(change.file);

      if (!change.backupPath) {
        return {
          success: false,
          filePath,
          error: '백업 경로가 CodeChange에 제공되지 않았습니다.',
        };
      }

      const backupPath = change.backupPath;

      // 백업 파일 내용 읽기
      const backupContent = await fs.readFile(backupPath, 'utf8');

      // 현재 파일 백업 (롤백 전 안전장치)
      const currentBackupPath = await this.createCurrentBackup(filePath);

      // 롤백 실행
      await fs.writeFile(filePath, backupContent, 'utf8');

      // 롤백 히스토리 업데이트
      this.updateRollbackHistory(filePath, backupPath);

      this.logger.info(
        `[RollbackAgent] 파일 롤백 완료: ${filePath} <- ${backupPath}`
      );

      return {
        success: true,
        filePath,
        backupPath,
      };
    } catch (e) {
      this.logger.error(`[RollbackAgent] 파일 롤백 실패: ${change.file}`, {
        error: e instanceof Error ? e.message : String(e),
      });
      return {
        success: false,
        filePath: change.file,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  /**
   * 현재 파일 백업 (롤백 전 안전장치)
   */
  private async createCurrentBackup(filePath: string): Promise<string> {
    try {
      const fileName = path.basename(filePath);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `${fileName}.rollback-backup.${timestamp}`;
      const backupPath = path.join(this.backupDir, backupFileName);

      // 현재 파일 내용 복사
      const currentContent = await fs.readFile(filePath, 'utf8');
      await fs.writeFile(backupPath, currentContent, 'utf8');

      return backupPath;
    } catch (e) {
      this.logger.warn(`[RollbackAgent] 현재 파일 백업 실패:`, {
        error: e instanceof Error ? e.message : String(e),
      });
      return '';
    }
  }

  /**
   * 롤백 히스토리 업데이트
   */
  private updateRollbackHistory(filePath: string, backupFile: string): void {
    if (!this.rollbackHistory.has(filePath)) {
      this.rollbackHistory.set(filePath, []);
    }

    const history = this.rollbackHistory.get(filePath)!;
    history.push(backupFile);

    // 최대 10개까지만 유지
    if (history.length > 10) {
      history.shift();
    }
  }

  /**
   * 롤백 히스토리 조회
   */
  getRollbackHistory(filePath: string): string[] {
    return this.rollbackHistory.get(filePath) || [];
  }

  /**
   * 전체 롤백 히스토리 조회
   */
  getAllRollbackHistory(): Map<string, string[]> {
    return new Map(this.rollbackHistory);
  }

  /**
   * 롤백 히스토리 초기화
   */
  clearRollbackHistory(): void {
    this.rollbackHistory.clear();
  }

  /**
   * 특정 파일의 롤백 히스토리 초기화
   */
  clearFileRollbackHistory(filePath: string): void {
    this.rollbackHistory.delete(filePath);
  }
}
