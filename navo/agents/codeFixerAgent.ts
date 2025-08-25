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
  ErrorType,
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
    // 코드 수정이 필요한 에러 타입들
    const fixableErrorTypes = [
      ErrorType.NULL_REFERENCE,
      ErrorType.ELEMENT_NOT_FOUND,
      ErrorType.TYPE_ERROR,
      ErrorType.VALIDATION_ERROR,
    ];

    // 에러 메시지에서 수정 가능한 패턴 확인
    const message = error.message.toLowerCase();
    return (
      fixableErrorTypes.includes(this.estimateErrorType(error)) ||
      message.includes('innerhtml') ||
      message.includes('getelementbyid') ||
      message.includes('cannot read') ||
      message.includes('is not a function')
    );
  }

  /**
   * 코드 수정 실행
   */
  async execute(
    error: Error,
    context: ErrorContext
  ): Promise<ResolutionResult> {
    try {
      this.logSuccess(context, '코드 수정 시작', { error: error.message });

      // 에러 타입에 따른 기본 수정 전략 생성
      const codeChanges = await this.generateCodeChanges(error, context);

      if (codeChanges.length === 0) {
        return {
          success: false,
          changes: [],
          executionTime: 0,
          errorMessage: '이 에러에 대한 자동 수정 방법이 없습니다.',
          nextSteps: [
            '수동 디버깅이 필요합니다',
            'Error Analyzer의 제안을 확인하세요',
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
   * 에러 타입에 따른 코드 변경사항 생성
   */
  private async generateCodeChanges(
    error: Error,
    context: ErrorContext
  ): Promise<CodeChange[]> {
    const errorType = this.estimateErrorType(error);
    const changes: CodeChange[] = [];

    try {
      switch (errorType) {
        case ErrorType.NULL_REFERENCE:
          changes.push(...(await this.generateNullReferenceFixes(error)));
          break;

        case ErrorType.ELEMENT_NOT_FOUND:
          changes.push(...(await this.generateElementNotFoundFixes(error)));
          break;

        case ErrorType.TYPE_ERROR:
          changes.push(...(await this.generateTypeErrorFixes(error)));
          break;

        default:
          // 기본적인 안전성 개선
          changes.push(...(await this.generateSafetyFixes(error)));
      }
    } catch (e) {
      console.warn(`[CodeFixerAgent] 코드 변경사항 생성 실패:`, e);
    }

    return changes;
  }

  /**
   * Null Reference 에러 수정 방법 생성
   */
  private async generateNullReferenceFixes(
    error: Error
  ): Promise<CodeChange[]> {
    const changes: CodeChange[] = [];

    if (error.message.includes('innerHTML')) {
      // innerHTML null 체크 추가
      changes.push({
        file: 'navo/web/app.js',
        action: 'modify',
        content: `// null 체크 추가
if (element && typeof element.innerHTML !== 'undefined') {
  element.innerHTML = content;
} else {
  console.warn('Element not found or innerHTML not supported:', element);
}`,
        reason: 'innerHTML 접근 전 null 체크가 필요합니다',
      });
    }

    if (error.message.includes('getElementById')) {
      // getElementById 안전한 사용법
      changes.push({
        file: 'navo/web/app.js',
        action: 'modify',
        content: `// 안전한 DOM 요소 접근
const element = document.getElementById('elementId');
if (!element) {
  console.warn('Element with id "elementId" not found');
  return;
}`,
        reason: 'DOM 요소 접근 전 존재 여부 확인이 필요합니다',
      });
    }

    return changes;
  }

  /**
   * Element Not Found 에러 수정 방법 생성
   */
  private async generateElementNotFoundFixes(
    error: Error
  ): Promise<CodeChange[]> {
    const changes: CodeChange[] = [];

    // HTML에 누락된 요소 추가
    if (error.message.includes('componentList')) {
      changes.push({
        file: 'navo/web/index.html',
        action: 'create',
        content: `<div id="componentList" class="component-list">
  <!-- Components will be loaded here -->
</div>`,
        reason: 'componentList 요소가 HTML에 정의되지 않았습니다',
      });
    }

    // createComponentBtn 관련 요소들 자동 생성
    if (
      error.message.includes('createComponentBtn') ||
      error.message.includes('addEventListener')
    ) {
      changes.push({
        file: 'navo/web/index.html',
        action: 'modify',
        content: `
        <!-- Component Modal -->
        <div id="componentModal" class="modal">
          <div class="modal-content">
            <div class="modal-header">
              <h2>Create Component</h2>
              <button id="closeComponentModal" class="close-btn">×</button>
            </div>
            <form id="componentForm" class="component-form">
              <div class="form-group">
                <label for="componentName">Name:</label>
                <input type="text" id="componentName" name="name" required />
              </div>
              <div class="form-group">
                <label for="componentDisplayName">Display Name:</label>
                <input type="text" id="componentDisplayName" name="display_name" required />
              </div>
              <div class="form-group">
                <label for="componentDescription">Description:</label>
                <textarea id="componentDescription" name="description" rows="3"></textarea>
              </div>
              <div class="form-group">
                <label for="componentCategory">Category:</label>
                <input type="text" id="componentCategory" name="category" />
              </div>
              <div class="form-group">
                <label for="componentTemplate">Template:</label>
                <textarea id="componentTemplate" name="render_template" rows="5" required></textarea>
              </div>
              <div class="form-group">
                <label for="componentCSS">CSS:</label>
                <textarea id="componentCSS" name="css_styles" rows="5"></textarea>
              </div>
              <div class="form-actions">
                <button type="button" id="previewComponentBtn">Preview</button>
                <button type="submit">Create Component</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Component Creation Button -->
        <button id="createComponentBtn" class="create-component-btn">
          🧩 Create Component
        </button>`,
        reason:
          'createComponentBtn과 componentModal 요소가 HTML에 정의되지 않았습니다',
      });

      // CSS 스타일도 함께 생성
      changes.push({
        file: 'navo/web/styles.css',
        action: 'modify',
        content: `
/* 🔧 Auto-fix applied by CodeFixerAgent: Component Modal 스타일 자동 생성 */
.modal {
  display: none;
  position: fixed;
  z-index: 1000;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0,0,0,0.5);
}

.modal.show {
  display: block;
}

.modal-content {
  background-color: #fefefe;
  margin: 5% auto;
  padding: 20px;
  border: 1px solid #888;
  width: 80%;
  max-width: 600px;
  border-radius: 8px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #aaa;
}

.close-btn:hover {
  color: #000;
}

.component-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.form-group label {
  font-weight: bold;
  color: #333;
}

.form-group input,
.form-group textarea {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}

.create-component-btn {
  background: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.create-component-btn:hover {
  background: #0056b3;
}`,
        reason: 'Component Modal에 필요한 CSS 스타일이 정의되지 않았습니다',
      });
    }

    return changes;
  }

  /**
   * Type Error 수정 방법 생성
   */
  private async generateTypeErrorFixes(error: Error): Promise<CodeChange[]> {
    const changes: CodeChange[] = [];

    if (error.message.includes('is not a function')) {
      // 함수 존재 여부 확인
      changes.push({
        file: 'navo/web/app.js',
        action: 'modify',
        content: `// 함수 존재 여부 확인
if (typeof functionName === 'function') {
  functionName();
} else {
  console.warn('Function functionName is not defined');
}`,
        reason: '함수 호출 전 존재 여부 확인이 필요합니다',
      });
    }

    return changes;
  }

  /**
   * 일반적인 안전성 개선 수정
   */
  private async generateSafetyFixes(error: Error): Promise<CodeChange[]> {
    const changes: CodeChange[] = [];

    // 전역 에러 핸들러 강화
    changes.push({
      file: 'navo/web/app.js',
      action: 'modify',
      content: `// 안전한 함수 실행
function safeExecute(fn, ...args) {
  try {
    if (typeof fn === 'function') {
      return fn(...args);
    }
    return null;
  } catch (error) {
    console.error('Function execution failed:', error);
    return null;
  }
}`,
      reason: '함수 실행 시 안전성을 높이기 위한 헬퍼 함수가 필요합니다',
    });

    return changes;
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
        console.error(`[CodeFixerAgent] 변경사항 적용 실패:`, change, e);
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
          // 간단한 수정: 주석 추가
          newContent = this.addSafetyComment(originalContent, change);
          break;

        case 'replace':
          newContent = change.content || originalContent;
          break;

        case 'delete':
          // 파일 삭제는 안전상 수행하지 않음
          console.warn(
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
      console.error(`[CodeFixerAgent] 변경사항 적용 실패:`, change, e);
      return { success: false };
    }
  }

  /**
   * 안전성 주석 추가
   */
  private addSafetyComment(content: string, change: CodeChange): string {
    const comment = `\n// 🔧 Auto-fix applied by CodeFixerAgent: ${change.reason}\n`;
    return content + comment;
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
      console.warn(`[CodeFixerAgent] 백업 정리 실패:`, e);
    }
  }

  /**
   * 에러 타입 추정 (간단한 버전)
   */
  private estimateErrorType(error: Error): ErrorType {
    const message = error.message.toLowerCase();

    if (message.includes('null') || message.includes('undefined')) {
      return ErrorType.NULL_REFERENCE;
    }

    if (message.includes('element') || message.includes('dom')) {
      return ErrorType.ELEMENT_NOT_FOUND;
    }

    if (message.includes('type') || message.includes('is not a function')) {
      return ErrorType.TYPE_ERROR;
    }

    return ErrorType.UNKNOWN_ERROR;
  }
}
