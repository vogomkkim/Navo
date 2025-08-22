/**
 * Rollback Agent
 *
 * 코드 수정 실패 시 이전 상태로 자동 복원하는 에이전트
 */

import {
  BaseAgent,
  ErrorResolutionAgent,
  ErrorContext,
  ResolutionResult,
  CodeChange,
} from '../core/errorResolution.js';
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
    return true; // 모든 에러에 대해 롤백 가능
  }

  /**
   * 롤백 실행
   */
  async execute(
    error: Error,
    context: ErrorContext
  ): Promise<ResolutionResult> {
    try {
      this.logSuccess(context, '롤백 프로세스 시작', { error: error.message });

      // 롤백이 필요한 파일들 식별
      const filesToRollback = await this.identifyFilesForRollback(
        error,
        context
      );

      if (filesToRollback.length === 0) {
        return {
          success: true,
          changes: [],
          executionTime: 0,
          nextSteps: [
            '롤백이 필요한 파일이 없습니다',
            '애플리케이션이 정상 상태입니다',
          ],
        };
      }

      // 롤백 실행
      const { result: rollbackResults, executionTime } =
        await this.measureExecutionTime(() =>
          this.performRollback(filesToRollback)
        );

      const successfulRollbacks = rollbackResults.filter((r) => r.success);
      const failedRollbacks = rollbackResults.filter((r) => !r.success);

      this.logSuccess(context, '롤백 프로세스 완료', {
        totalFiles: filesToRollback.length,
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
   * 롤백이 필요한 파일들 식별
   */
  private async identifyFilesForRollback(
    error: Error,
    context: ErrorContext
  ): Promise<string[]> {
    const filesToRollback: string[] = [];

    try {
      // 백업 디렉토리 확인
      try {
        await fs.access(this.backupDir);
      } catch {
        // 백업 디렉토리가 없으면 롤백할 파일이 없음
        return filesToRollback;
      }

      // 백업 파일들 스캔
      const backupFiles = await fs.readdir(this.backupDir);

      // 백업 파일에서 원본 파일 경로 추출
      for (const backupFile of backupFiles) {
        if (backupFile.endsWith('.backup')) {
          const originalFileName = backupFile.replace(
            /\.backup\.\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/,
            ''
          );
          const originalFilePath = path.join(process.cwd(), originalFileName);

          // 원본 파일이 존재하는지 확인
          try {
            await fs.access(originalFilePath);
            filesToRollback.push(originalFilePath);
          } catch {
            // 원본 파일이 없으면 무시
            console.warn(
              `[RollbackAgent] 원본 파일을 찾을 수 없음: ${originalFilePath}`
            );
          }
        }
      }

      // 에러 타입에 따른 추가 파일 식별
      if (
        error.message.includes('innerHTML') ||
        error.message.includes('getElementById')
      ) {
        const webFiles = ['navo/web/app.js', 'navo/web/index.html'];
        for (const webFile of webFiles) {
          const fullPath = path.resolve(webFile);
          if (filesToRollback.includes(fullPath)) {
            continue; // 이미 포함되어 있음
          }

          try {
            await fs.access(fullPath);
            filesToRollback.push(fullPath);
          } catch {
            // 파일이 없으면 무시
          }
        }
      }
    } catch (e) {
      console.warn(`[RollbackAgent] 롤백 대상 파일 식별 실패:`, e);
    }

    return filesToRollback;
  }

  /**
   * 롤백 실행
   */
  private async performRollback(filesToRollback: string[]): Promise<
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

    for (const filePath of filesToRollback) {
      try {
        const result = await this.rollbackSingleFile(filePath);
        results.push(result);
      } catch (e) {
        results.push({
          success: false,
          filePath,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    return results;
  }

  /**
   * 단일 파일 롤백
   */
  private async rollbackSingleFile(filePath: string): Promise<{
    success: boolean;
    filePath: string;
    backupPath?: string;
    error?: string;
  }> {
    try {
      const fileName = path.basename(filePath);

      // 해당 파일의 가장 최근 백업 찾기
      const backupFiles = await this.findBackupFiles(fileName);

      if (backupFiles.length === 0) {
        return {
          success: false,
          filePath,
          error: '백업 파일을 찾을 수 없습니다',
        };
      }

      // 가장 최근 백업 선택 (타임스탬프가 가장 늦은 것)
      const latestBackup = backupFiles[0]; // 이미 정렬되어 있음
      const backupPath = path.join(this.backupDir, latestBackup);

      // 백업 파일 내용 읽기
      const backupContent = await fs.readFile(backupPath, 'utf8');

      // 현재 파일 백업 (롤백 전 안전장치)
      const currentBackupPath = await this.createCurrentBackup(filePath);

      // 롤백 실행
      await fs.writeFile(filePath, backupContent, 'utf8');

      // 롤백 히스토리 업데이트
      this.updateRollbackHistory(filePath, latestBackup);

      console.log(
        `[RollbackAgent] 파일 롤백 완료: ${filePath} -> ${latestBackup}`
      );

      return {
        success: true,
        filePath,
        backupPath: latestBackup,
      };
    } catch (e) {
      console.error(`[RollbackAgent] 파일 롤백 실패: ${filePath}`, e);
      return {
        success: false,
        filePath,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  /**
   * 백업 파일들 찾기
   */
  private async findBackupFiles(fileName: string): Promise<string[]> {
    try {
      const files = await fs.readdir(this.backupDir);

      // 해당 파일의 백업들만 필터링
      const backupFiles = files
        .filter((file) => file.startsWith(fileName + '.backup.'))
        .sort()
        .reverse(); // 최신 파일이 앞에 오도록 정렬

      return backupFiles;
    } catch (e) {
      console.warn(`[RollbackAgent] 백업 파일 검색 실패:`, e);
      return [];
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
      console.warn(`[RollbackAgent] 현재 파일 백업 실패:`, e);
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
