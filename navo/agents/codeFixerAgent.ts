/**
 * Code Fixer Agent
 *
 * AI가 제안한 해결 방법을 실제로 코드에 적용하는 에이전트
 */

import {
  BaseAgent,
  ErrorResolutionAgent,
  ErrorContext,
  ResolutionResult,
  CodeChange,
  ErrorType, // Keep ErrorType for now, might be used in other parts of the file
} from '../core/errorResolution.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export class CodeFixerAgent extends BaseAgent {
  private backupDir: string;
  private maxBackups: number = 5;

  constructor() {
    super('CodeFixerAgent', 2); // Error Analyzer 다음 우선순위

    // 백업 디렉토리 설정
    this.backupDir = path.join(process.cwd(), '.backups');
    this.ensureBackupDir();
  }

  /**
   * 이 에이전트가 처리할 수 있는 에러인지 확인
   * Code Fixer는 코드 수정이 필요한 에러를 처리
   */
  canHandle(error: Error): boolean {
    return true; // Orchestrator will pass relevant changes
  }

  /**
   * 코드 수정 실행
   */
  async execute(
    error: Error,
    context: ErrorContext,
    codeChanges: CodeChange[]
  ): Promise<ResolutionResult> {
    try {
      this.logSuccess(context, '코드 수정 시작', { error: error.message });

      if (codeChanges.length === 0) {
        return {
          success: false,
          changes: [],
          executionTime: 0,
          errorMessage: '제공된 코드 변경사항이 없습니다.',
          nextSteps: [
            'Error Analyzer Agent에서 코드 변경사항을 생성해야 합니다.',
          ],
        };
      }

      // 코드 수정 실행
      const { result: appliedChanges, executionTime } =
        await this.measureExecutionTime(() =>
          this.applyCodeChanges(codeChanges)
        );

      this.logSuccess(context, '코드 수정 완료', {
        changesApplied: appliedChanges.length,
        executionTime,
      });

      return {
        success: true,
        changes: appliedChanges,
        executionTime,
        nextSteps: [
          '코드 수정이 완료되었습니다',
          '애플리케이션을 새로고침하여 에러가 해결되었는지 확인하세요',
          '새로운 에러가 발생하면 Test Runner Agent가 확인합니다',
        ],
      };
    } catch (e) {
      this.logError(error, context, '코드 수정 실패');

      return {
        success: false,
        changes: [],
        executionTime: 0,
        errorMessage: `코드 수정 실패: ${e instanceof Error ? e.message : String(e)}`,
        nextSteps: [
          '롤백이 자동으로 시도됩니다',
          '수동 복구가 필요할 수 있습니다',
        ],
      };
    }
  }

  /**
   * 코드 변경사항 적용
   */
  private async applyCodeChanges(changes: CodeChange[]): Promise<CodeChange[]> {
    const appliedChanges: CodeChange[] = [];

    for (const change of changes) {
      try {
        const result = await this.applySingleChange(change);
        if (result.success) {
          appliedChanges.push({
            ...change,
            backupPath: result.backupPath,
            originalContent: result.originalContent,
          });
        }
      } catch (e) {
      this.logger.error(`[CodeFixerAgent] 변경사항 적용 실패:`, { change: change, error: e instanceof Error ? e.message : String(e) });
      }
    }

    return appliedChanges;
  }

  /**
   * 단일 코드 변경사항 적용
   */
  private async applySingleChange(change: CodeChange): Promise<{
    success: boolean;
    backupPath?: string;
    originalContent?: string;
  }> {
    try {
      const filePath = path.resolve(change.file);

      // 파일 존재 여부 확인
      try {
        await fs.access(filePath);
      } catch {
        // 파일이 없으면 생성
        if (change.action === 'create') {
          await fs.writeFile(filePath, change.content || '', 'utf8');
          return { success: true };
        } else {
          throw new Error(`File not found: ${change.file}`);
        }
      }

      // 백업 생성
      const backupPath = await this.createBackup(filePath);

      // 원본 내용 읽기
      const originalContent = await fs.readFile(filePath, 'utf8');

      // 변경사항 적용
      let newContent = originalContent;

      switch (change.action) {
        case 'modify':
          if (change.lineNumber !== undefined && change.content !== undefined) {
            const lines = originalContent.split('\n');
            if (change.lineNumber < lines.length) {
              if (change.startColumn !== undefined && change.endColumn !== undefined) {
                // More granular replacement within a line
                const line = lines[change.lineNumber];
                newContent = lines.slice(0, change.lineNumber).join('\n') + '\n' +
                             line.substring(0, change.startColumn) +
                             change.content +
                             line.substring(change.endColumn) + '\n' + lines.slice(change.lineNumber + 1).join('\n');
              } else {
                // Replace entire line
                lines[change.lineNumber] = change.content;
                newContent = lines.join('\n');
              }
            } else {
              this.logger.warn(`[CodeFixerAgent] Line number out of bounds for modify: ${change.file}:${change.lineNumber}`);
              return { success: false };
            }
          } else if (change.oldContent !== undefined && change.content !== undefined) {
            // Find and replace specific oldContent with newContent
            newContent = originalContent.replace(change.oldContent, change.content);
          } else {
            this.logger.warn(`[CodeFixerAgent] Insufficient information for modify action: ${change.file}`);
            return { success: false };
          }
          break;

        case 'replace':
          if (change.oldContent !== undefined && change.content !== undefined) {
            // Replace specific oldContent with newContent
            newContent = originalContent.replace(change.oldContent, change.content);
          } else {
            throw new Error(`'oldContent' and 'content' are required for 'replace' action: ${change.file}`);
          }
          break;

        case 'delete':
          // 파일 삭제는 안전상 수행하지 않음
          this.logger.warn(
            `[CodeFixerAgent] 파일 삭제는 안전상 수행하지 않습니다: ${change.file}`
          );
          return { success: false };
      }

      // 수정된 내용 저장
      await fs.writeFile(filePath, newContent, 'utf8');

      return {
        success: true,
        backupPath,
        originalContent,
      };
    } catch (e) {
      this.logger.error(`[CodeFixerAgent] 변경사항 적용 실패:`, { change: change, error: e instanceof Error ? e.message : String(e) });
      return { success: false };
    }
  }

  /**
   * 백업 디렉토리 생성
   */
  private async ensureBackupDir(): Promise<void> {
    try {
      await fs.access(this.backupDir);
    } catch {
      await fs.mkdir(this.backupDir, { recursive: true });
    }
  }

  /**
   * 파일 백업 생성
   */
  private async createBackup(filePath: string): Promise<string> {
    const fileName = path.basename(filePath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `${fileName}.backup.${timestamp}`;
    const backupPath = path.join(this.backupDir, backupFileName);

    // 백업 파일 복사
    await fs.copyFile(filePath, backupPath);

    // 오래된 백업 정리
    await this.cleanupOldBackups(fileName);

    return backupPath;
  }

  /**
   * 오래된 백업 파일 정리
   */
  private async cleanupOldBackups(fileName: string): Promise<void> {
    try {
      const files = await fs.readdir(this.backupDir);
      const backups = files
        .filter((file) => file.startsWith(fileName + '.backup.'))
        .sort()
        .reverse();

      // 최대 백업 수를 초과하는 파일들 삭제
      if (backups.length > this.maxBackups) {
        for (let i = this.maxBackups; i < backups.length; i++) {
          const fileToDelete = path.join(this.backupDir, backups[i]);
          await fs.unlink(fileToDelete);
        }
      }
    } catch (e) {
      this.logger.warn(`[CodeFixerAgent] 백업 정리 실패:`, { error: e instanceof Error ? e.message : String(e) });
    }
  }
}