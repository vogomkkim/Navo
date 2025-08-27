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
} from "../core/errorResolution.js";
import * as fs from "fs/promises";
import * as path from "path";

export class CodeGeneratorAgent extends BaseAgent {
  private backupDir: string;
  private maxBackups: number = 5;

  constructor() {
    super("CodeGeneratorAgent", 2); // Project Architect 다음 우선순위

    // 백업 디렉토리 설정
    this.backupDir = path.join(process.cwd(), ".backups");
    this.ensureBackupDir();
  }

  /**
   * 이 에이전트가 처리할 수 있는 요청인지 확인
   */
  canHandle(request: any): boolean {
    // 프로젝트 생성 요청인지 확인
    if (
      request &&
      typeof request === "object" &&
      request.name &&
      request.description
    ) {
      return true; // 프로젝트 생성 요청
    }

    // 에러 객체인지 확인 (기존 호환성 유지)
    if (request instanceof Error) {
      return true; // 에러 해결 요청
    }

    return false;
  }

  /**
   * 프로젝트 생성 또는 에러 해결 실행
   */
  async execute(request: any, context: any, payload?: any): Promise<any> {
    try {
      // 프로젝트 생성 요청인지 확인
      if (
        request &&
        typeof request === "object" &&
        request.name &&
        request.description
      ) {
        return await this.generateProject(request, context, payload);
      }

      // 에러 해결 요청인지 확인 (기존 호환성 유지)
      if (request instanceof Error) {
        return await this.fixCode(request, context, payload);
      }

      throw new Error("지원하지 않는 요청 타입입니다.");
    } catch (e) {
      this.logger.error("Code Generator Agent 실행 실패:", e);
      throw e;
    }
  }

  /**
   * 프로젝트 생성 실행
   */
  private async generateProject(
    request: any,
    context: any,
    payload?: any
  ): Promise<any> {
    try {
      this.logger.info("🚀 프로젝트 코드 생성 시작", { request });

      // 아키텍처 정보가 payload에 포함되어 있어야 함
      const architecture = payload?.architecture;
      if (!architecture) {
        throw new Error("아키텍처 정보가 필요합니다.");
      }

      // JSON 형태로 프로젝트 구조와 코드 생성
      const projectStructure = await this.generateProjectStructure(
        request,
        architecture
      );

      this.logger.info("✅ 프로젝트 코드 생성 완료", {
        filesGenerated: projectStructure.files.length,
      });

      return {
        success: true,
        project: {
          name: request.name,
          description: request.description,
          structure: projectStructure.structure,
          files: projectStructure.files,
          metadata: {
            createdAt: new Date().toISOString(),
            technology: architecture.technology,
            components: architecture.components,
            complexity: request.complexity || "medium",
          },
        },
        executionTime: Date.now(),
        nextSteps: [
          "프로젝트 코드 생성 완료: Development Guide Agent가 개발 가이드를 작성합니다",
          "프론트엔드에서 동적 렌더링으로 프로젝트를 확인할 수 있습니다",
          "필요한 경우 추가 수정을 요청하세요",
        ],
      };
    } catch (e) {
      this.logger.error("프로젝트 생성 실패:", e);
      throw e;
    }
  }

  /**
   * 에러 해결을 위한 코드 수정 실행 (기존 기능 유지)
   */
  private async fixCode(
    error: Error,
    context: ErrorContext,
    codeChanges?: CodeChange[]
  ): Promise<ResolutionResult> {
    try {
      this.logSuccess(context, "코드 수정 시작", { error: error.message });

      const plannedChanges: CodeChange[] = codeChanges ?? [];

      if (plannedChanges.length === 0) {
        return {
          success: false,
          changes: [],
          executionTime: 0,
          errorMessage: "제공된 코드 변경사항이 없습니다.",
          nextSteps: [
            "Error Analyzer Agent에서 코드 변경사항을 생성해야 합니다.",
          ],
        };
      }

      // 코드 수정 실행
      const { result: appliedChanges, executionTime } =
        await this.measureExecutionTime(() =>
          this.applyCodeChanges(plannedChanges)
        );

      this.logSuccess(context, "코드 수정 완료", {
        changesApplied: appliedChanges.length,
        executionTime,
      });

      return {
        success: true,
        changes: appliedChanges,
        executionTime,
        nextSteps: [
          "코드 수정이 완료되었습니다",
          "애플리케이션을 새로고침하여 에러가 해결되었는지 확인하세요",
          "새로운 에러가 발생하면 Test Runner Agent가 확인합니다",
        ],
      };
    } catch (e) {
      this.logError(error, context, "코드 수정 실패");

      return {
        success: false,
        changes: [],
        executionTime: 0,
        errorMessage: `코드 수정 실패: ${e instanceof Error ? e.message : String(e)}`,
        nextSteps: [
          "롤백이 자동으로 시도됩니다",
          "수동 복구가 필요할 수 있습니다",
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
        this.logger.error(`[CodeFixerAgent] 변경사항 적용 실패:`, {
          change: change,
          error: e instanceof Error ? e.message : String(e),
        });
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
        if (change.action === "create") {
          await fs.writeFile(filePath, change.content || "", "utf8");
          return { success: true };
        } else {
          throw new Error(`File not found: ${change.file}`);
        }
      }

      // 백업 생성
      const backupPath = await this.createBackup(filePath);

      // 원본 내용 읽기
      const originalContent = await fs.readFile(filePath, "utf8");

      // 변경사항 적용
      let newContent = originalContent;

      switch (change.action) {
        case "modify":
          if (change.lineNumber !== undefined && change.content !== undefined) {
            const lines = originalContent.split("\n");
            if (change.lineNumber < lines.length) {
              if (
                change.startColumn !== undefined &&
                change.endColumn !== undefined
              ) {
                // More granular replacement within a line
                const line = lines[change.lineNumber];
                newContent =
                  lines.slice(0, change.lineNumber).join("\n") +
                  "\n" +
                  line.substring(0, change.startColumn) +
                  change.content +
                  line.substring(change.endColumn) +
                  "\n" +
                  lines.slice(change.lineNumber + 1).join("\n");
              } else {
                // Replace entire line
                lines[change.lineNumber] = change.content;
                newContent = lines.join("\n");
              }
            } else {
              this.logger.warn(
                `[CodeFixerAgent] Line number out of bounds for modify: ${change.file}:${change.lineNumber}`
              );
              return { success: false };
            }
          } else if (
            change.oldContent !== undefined &&
            change.content !== undefined
          ) {
            // Find and replace specific oldContent with newContent
            newContent = originalContent.replace(
              change.oldContent,
              change.content
            );
          } else {
            this.logger.warn(
              `[CodeFixerAgent] Insufficient information for modify action: ${change.file}`
            );
            return { success: false };
          }
          break;

        case "replace":
          if (change.oldContent !== undefined && change.content !== undefined) {
            // Replace specific oldContent with newContent
            newContent = originalContent.replace(
              change.oldContent,
              change.content
            );
          } else {
            throw new Error(
              `'oldContent' and 'content' are required for 'replace' action: ${change.file}`
            );
          }
          break;

        case "delete":
          // 파일 삭제는 안전상 수행하지 않음
          this.logger.warn(
            `[CodeFixerAgent] 파일 삭제는 안전상 수행하지 않습니다: ${change.file}`
          );
          return { success: false };
      }

      // 수정된 내용 저장
      await fs.writeFile(filePath, newContent, "utf8");

      return {
        success: true,
        backupPath,
        originalContent,
      };
    } catch (e) {
      this.logger.error(`[CodeFixerAgent] 변경사항 적용 실패:`, {
        change: change,
        error: e instanceof Error ? e.message : String(e),
      });
      return { success: false };
    }
  }

  /**
   * 프로젝트 구조와 코드를 JSON 형태로 생성
   */
  private async generateProjectStructure(
    request: any,
    architecture: any
  ): Promise<any> {
    const files: any[] = [];
    const structure: any = {};

    try {
      // package.json 생성
      const packageJson = this.generatePackageJson(request, architecture);
      files.push({
        path: "package.json",
        content: packageJson,
        type: "config",
        description: "프로젝트 설정 및 의존성 정보",
      });
      structure["package.json"] = {
        type: "config",
        size: JSON.stringify(packageJson).length,
      };

      // README.md 생성
      const readme = this.generateReadme(request, architecture);
      files.push({
        path: "README.md",
        content: readme,
        type: "documentation",
        description: "프로젝트 설명 및 사용법",
      });
      structure["README.md"] = { type: "documentation", size: readme.length };

      // src/ 디렉토리 구조
      structure["src/"] = { type: "directory", children: {} };

      // 메인 애플리케이션 파일 생성
      const mainFile = this.generateMainFile(request, architecture);
      files.push({
        path: "src/index.js",
        content: mainFile,
        type: "code",
        description: "애플리케이션 진입점",
      });
      structure["src/"]["index.js"] = { type: "code", size: mainFile.length };

      // components/ 디렉토리
      if (architecture.components && Array.isArray(architecture.components)) {
        structure["src/"]["components/"] = { type: "directory", children: {} };

        for (const component of architecture.components) {
          const componentFile = this.generateComponentFile(
            component,
            architecture
          );
          files.push({
            path: `src/components/${component}.js`,
            content: componentFile,
            type: "code",
            description: `${component} 컴포넌트`,
          });
          structure["src/"]["components/"][`${component}.js`] = {
            type: "code",
            size: componentFile.length,
          };
        }
      }

      // pages/ 디렉토리 (웹 프로젝트인 경우)
      if (request.type === "web" || request.type === "fullstack") {
        structure["src/"]["pages/"] = { type: "directory", children: {} };
        const pageFile = this.generatePageFile(request, architecture);
        files.push({
          path: "src/pages/index.js",
          content: pageFile,
          type: "code",
          description: "메인 페이지",
        });
        structure["src/"]["pages/"]["index.js"] = {
          type: "code",
          size: pageFile.length,
        };
      }

      this.logger.info(`프로젝트 구조 생성 완료: ${files.length}개 파일`);
      return { files, structure };
    } catch (error) {
      this.logger.error("프로젝트 구조 생성 실패:", error);
      throw error;
    }
  }

  /**
   * package.json 생성
   */
  private generatePackageJson(request: any, architecture: any): any {
    const dependencies = architecture.technology?.includes("React")
      ? {
          react: "^18.2.0",
          "react-dom": "^18.2.0",
        }
      : {};

    return {
      name: request.name.toLowerCase().replace(/\s+/g, "-"),
      version: "1.0.0",
      description: request.description,
      main: "src/index.js",
      scripts: {
        start: "node src/index.js",
        dev: "node src/index.js",
        test: 'echo "Error: no test specified" && exit 1',
      },
      dependencies,
      devDependencies: {},
      keywords: request.features,
      author: "Navo AI",
      license: "MIT",
    };
  }

  /**
   * README.md 생성
   */
  private generateReadme(request: any, architecture: any): string {
    return `# ${request.name}

${request.description}

## 주요 기능
${request.features.map((feature) => `- ${feature}`).join("\n")}

## 기술 스택
${architecture.technology?.join(", ") || "기본 기술 스택"}

## 설치 및 실행
\`\`\`bash
npm install
npm start
\`\`\`

## 프로젝트 구조
${architecture.components?.map((component) => `- ${component}`).join("\n") || "기본 구조"}

## 개발 가이드
이 프로젝트는 Navo AI가 자동으로 생성했습니다.
`;
  }

  /**
   * 메인 애플리케이션 파일 생성
   */
  private generateMainFile(request: any, architecture: any): string {
    if (architecture.technology?.includes("React")) {
      return `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;
    }

    return `// ${request.name} - ${request.description}
// 생성일: ${new Date().toISOString()}

console.log("🚀 ${request.name} 프로젝트가 시작되었습니다!");

// 주요 기능들
${request.features.map((feature) => `// - ${feature}`).join("\n")}

// 애플리케이션 초기화
function initializeApp() {
  console.log("애플리케이션 초기화 중...");
  // 여기에 초기화 로직을 추가하세요
}

// 애플리케이션 시작
initializeApp();
`;
  }

  /**
   * 컴포넌트 파일 생성
   */
  private generateComponentFile(
    componentName: string,
    architecture: any
  ): string {
    if (architecture.technology?.includes("React")) {
      return `import React from 'react';

export default function ${componentName}() {
  return (
    <div className="${componentName.toLowerCase()}">
      <h2>${componentName}</h2>
      <p>이 컴포넌트는 ${componentName} 기능을 담당합니다.</p>
    </div>
  );
}
`;
    }

    return `// ${componentName} 컴포넌트
// 생성일: ${new Date().toISOString()}

class ${componentName} {
  constructor() {
    this.name = "${componentName}";
  }

  init() {
    console.log("${componentName} 컴포넌트 초기화");
  }

  render() {
    console.log("${componentName} 컴포넌트 렌더링");
  }
}

module.exports = ${componentName};
`;
  }

  /**
   * 페이지 파일 생성
   */
  private generatePageFile(request: any, architecture: any): string {
    if (architecture.technology?.includes("React")) {
      return `import React from 'react';
import Header from '../components/Header';

export default function HomePage() {
  return (
    <div className="home-page">
      <Header />
      <main className="main-content">
        <h1>${request.name}</h1>
        <p>${request.description}</p>
        <div className="features">
          <h2>주요 기능</h2>
          <ul>
            ${request.features.map((feature) => `<li key="${feature}">${feature}</li>`).join("\n            ")}
          </ul>
        </div>
      </main>
    </div>
  );
}
`;
    }

    return `// ${request.name} - 메인 페이지
// 생성일: ${new Date().toISOString()}

class HomePage {
  constructor() {
    this.title = "${request.name}";
    this.description = "${request.description}";
  }

  render() {
    console.log("메인 페이지 렌더링:", this.title);
    // 여기에 페이지 렌더링 로직을 추가하세요
  }
}

module.exports = HomePage;
`;
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
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
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
        .filter((file) => file.startsWith(fileName + ".backup."))
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
      this.logger.warn(`[CodeFixerAgent] 백업 정리 실패:`, {
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
}
