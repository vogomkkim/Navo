/**
 * Project Architect Agent (기존 Error Analyzer 확장)
 *
 * AI를 사용하여 프로젝트 요구사항을 분석하고 아키텍처를 설계하는 에이전트
 * 에러 해결과 프로젝트 설계를 모두 지원합니다.
 */

import {
  BaseAgent,
  ErrorResolutionAgent,
  ErrorContext,
  ResolutionResult,
  ErrorType,
  ErrorSeverity,
  ErrorAnalysis,
} from "../core/errorResolution.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs/promises";
import { exec as cpExec } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(cpExec);

export class ProjectArchitectAgent extends BaseAgent {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private analysisCache: Map<string, ErrorAnalysis> = new Map();

  constructor() {
    super("ProjectArchitectAgent", 1); // 최고 우선순위

    // Gemini API 초기화
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  }

  /**
   * 이 에이전트가 처리할 수 있는 요청인지 확인
   * Project Architect Agent는 프로젝트 설계와 에러 분석을 모두 지원
   */
  canHandle(request: any): boolean {
    // 프로젝트 생성 요청인지 확인
    if (
      request &&
      typeof request === "object" &&
      request.name &&
      request.description
    ) {
      return true; // 프로젝트 설계 요청
    }

    // 에러 객체인지 확인 (기존 호환성 유지)
    if (request instanceof Error) {
      return true; // 에러 분석 요청
    }

    return false;
  }

  /**
   * 프로젝트 설계 또는 에러 분석 실행
   */
  async execute(request: any, context: any): Promise<any> {
    try {
      // 프로젝트 설계 요청인지 확인
      if (
        request &&
        typeof request === "object" &&
        request.name &&
        request.description
      ) {
        return await this.designProject(request, context);
      }

      // 에러 분석 요청인지 확인 (기존 호환성 유지)
      if (request instanceof Error) {
        return await this.analyzeError(request, context);
      }

      throw new Error("지원하지 않는 요청 타입입니다.");
    } catch (e) {
      this.logger.error("Project Architect Agent 실행 실패:", e);
      throw e;
    }
  }

  /**
   * 프로젝트 설계 실행
   */
  private async designProject(request: any, context: any): Promise<any> {
    try {
      this.logger.info("🏗️ 프로젝트 아키텍처 설계 시작", { request });

      // AI를 사용한 프로젝트 아키텍처 설계
      const architecture = await this.designArchitectureWithAI(
        request,
        context
      );

      this.logger.info("✅ 프로젝트 아키텍처 설계 완료", { architecture });

      return {
        success: true,
        architecture,
        executionTime: Date.now(),
        nextSteps: [
          "아키텍처 설계 완료: UI/UX Designer Agent가 인터페이스를 설계합니다",
          "Code Generator Agent가 실제 코드를 생성합니다",
          "Development Guide Agent가 개발 가이드를 작성합니다",
        ],
      };
    } catch (e) {
      this.logger.error("프로젝트 설계 실패:", e);
      throw e;
    }
  }

  /**
   * 에러 분석 실행 (기존 기능 유지)
   */
  private async analyzeError(
    error: Error,
    context: ErrorContext
  ): Promise<ResolutionResult> {
    try {
      this.logSuccess(context, "에러 분석 시작", { error: error.message });

      // AI를 사용한 에러 분석
      const analysis = await this.analyzeErrorWithAI(error, context);

      // 분석 결과를 바탕으로 해결 방법 제시
      const solution = this.generateSolutionFromAnalysis(analysis);

      this.logSuccess(context, "에러 분석 완료", {
        errorType: analysis.errorType,
        severity: analysis.severity,
        solution: solution.description,
      });

      return {
        success: true,
        changes: [], // 분석 단계에서는 실제 수정을 하지 않음
        executionTime: 0, // measureExecutionTime을 사용하지 않음
        nextSteps: [
          "분석 완료: AI가 제안한 해결 방법을 확인하세요",
          "CodeFixerAgent가 자동으로 코드를 수정할 수 있습니다",
          "수동 수정이 필요한 경우 상세한 가이드를 제공합니다",
        ],
      };
    } catch (e) {
      this.logError(error, context, "에러 분석 실패");

      return {
        success: false,
        changes: [],
        executionTime: 0,
        errorMessage: `에러 분석 실패: ${e instanceof Error ? e.message : String(e)}`,
        nextSteps: ["수동 디버깅이 필요합니다", "시스템 관리자에게 문의하세요"],
      };
    }
  }

  /**
   * AI를 사용하여 프로젝트 아키텍처 설계
   */
  private async designArchitectureWithAI(
    request: any,
    context: any
  ): Promise<any> {
    try {
      const prompt = `
프로젝트 요구사항을 분석하여 아키텍처를 설계해주세요:

프로젝트명: ${request.name}
설명: ${request.description}
타입: ${request.type}
주요 기능: ${request.features.join(", ")}
기술 스택: ${request.technology?.join(", ") || "자동 선택"}
복잡도: ${request.complexity || "medium"}

다음 형식으로 응답해주세요:
{
  "technology": ["기술1", "기술2"],
  "components": ["컴포넌트1", "컴포넌트2"],
  "database": {"type": "데이터베이스 타입", "tables": ["테이블1", "테이블2"]},
  "api": {"endpoints": ["엔드포인트1", "엔드포인트2"]},
  "complexity": "복잡도 레벨"
}
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // JSON 파싱
      const architecture = JSON.parse(text);

      return architecture;
    } catch (error) {
      this.logger.error("AI 아키텍처 설계 실패:", error);

      // 기본 아키텍처 반환
      return {
        technology: ["React", "Node.js", "PostgreSQL"],
        components: ["Header", "Main", "Footer"],
        database: { type: "PostgreSQL", tables: ["users", "projects"] },
        api: { endpoints: ["/api/users", "/api/projects"] },
        complexity: request.complexity || "medium",
      };
    }
  }

  /**
   * AI를 사용하여 에러 분석
   */
  private async analyzeErrorWithAI(
    error: Error,
    context: ErrorContext
  ): Promise<ErrorAnalysis> {
    const cacheKey = `${error.message}-${JSON.stringify(context)}`;
    if (this.analysisCache.has(cacheKey)) {
      this.logger.info(
        `[ProjectArchitectAgent] Returning cached analysis for error: ${error.message}`
      );
      return this.analysisCache.get(cacheKey)!;
    }

    const dynamicContext = await this.fetchDynamicContext(error, context); // Fetch dynamic context
    const prompt = this.buildAnalysisPrompt(error, context, dynamicContext); // Pass dynamic context to prompt builder

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // AI 응답 파싱
      const aiAnalysis = this.parseAIResponse(text);

      // 기본 에러 타입 및 심각도 추정 (AI 분석 실패 시 대체)
      const fallbackType = this.estimateErrorType(error);
      const fallbackSeverity = this.estimateErrorSeverity(error, context);

      const finalAnalysis: ErrorAnalysis = {
        errorType: aiAnalysis.errorType || fallbackType,
        rootCause: aiAnalysis.rootCause || this.estimateRootCause(error),
        severity: aiAnalysis.severity || fallbackSeverity,
        solution: aiAnalysis.solution || this.generateFallbackSolution(error),
        metadata: {
          aiAnalyzed: true,
          fallbackUsed: !aiAnalysis.errorType,
          originalError: error.message,
          context: context,
        },
      };

      this.analysisCache.set(cacheKey, finalAnalysis);
      return finalAnalysis;
    } catch (aiError) {
      this.logger.warn(`[ErrorAnalyzerAgent] AI 분석 실패, 대체 방법 사용:`, {
        aiError: aiError instanceof Error ? aiError.message : String(aiError),
      });

      // AI 분석 실패 시 기본 분석 사용
      const fallbackAnalysis: ErrorAnalysis = {
        errorType: this.estimateErrorType(error),
        rootCause: this.estimateRootCause(error),
        severity: this.estimateErrorSeverity(error, context),
        solution: this.generateFallbackSolution(error),
        metadata: {
          aiAnalyzed: false,
          fallbackUsed: true,
          aiError: aiError instanceof Error ? aiError.message : String(aiError),
          originalError: error.message,
          context: context,
        },
      };
      this.analysisCache.set(cacheKey, fallbackAnalysis);
      return fallbackAnalysis;
    }
  }

  /**
   * AI 분석을 위한 프롬프트 생성
   */
  private buildAnalysisPrompt(
    error: Error,
    context: ErrorContext,
    dynamicContext: string
  ): string {
    return `Analyze the following JavaScript error and provide a concrete solution in JSON format.

Error Details:
- Message: ${error.message}
- File: ${(error as any).filename || "unknown"}
- Line: ${(error as any).lineno || "unknown"}
- Stack: ${error.stack || "unknown"}

Context:
- URL: ${context.url}
- User Agent: ${context.userAgent}
- Project ID: ${context.projectId || "none"}
- Timestamp: ${context.timestamp.toISOString()}
${dynamicContext}

Response Format (JSON only):
{
  "errorType": "null_reference|element_not_found|dom_manipulation|network_error|api_response_error|authentication_error|type_error|undefined_error|validation_error|infinite_loop|memory_leak|timeout_error|unknown_error",
  "rootCause": "brief explanation of root cause",
  "severity": "critical|high|medium|low",
  "solution": {
    "description": "brief description of solution",
    "codeChanges": [
      {
        "file": "path/to/file (e.g., navo/web/app.js)",
        "action": "create|modify|delete|replace",
        "content": "new code content (if applicable)",
        "reason": "reason for change"
      }
    ],
    "estimatedTime": "estimated time in seconds",
    "autoRecoverable": true/false
  }
}

Instructions:
- Respond with JSON only.
- Select errorType and severity from provided options.
- Solution must be concrete and actionable.
- File paths in codeChanges must be actual file paths.
`;
  }

  /**
   * AI 응답 파싱
   */
  private parseAIResponse(response: string): Partial<ErrorAnalysis> {
    try {
      // 마크다운 코드 블록 제거
      let cleanResponse = response;
      if (response.includes("```json")) {
        cleanResponse = response
          .replace(/```json\s*/, "")
          .replace(/\s*```$/, "");
      } else if (response.includes("```")) {
        cleanResponse = response.replace(/```\s*/, "").replace(/\s*```$/, "");
      }

      const parsed = JSON.parse(cleanResponse);

      // 필수 필드 검증
      if (
        !parsed.errorType ||
        !parsed.rootCause ||
        !parsed.severity ||
        !parsed.solution
      ) {
        throw new Error("AI 응답에 필수 필드가 누락되었습니다");
      }

      return parsed;
    } catch (parseError) {
      this.logger.error(`[ErrorAnalyzerAgent] AI 응답 파싱 실패:`, {
        parseError:
          parseError instanceof Error ? parseError.message : String(parseError),
      });
      this.logger.error(`[ErrorAnalyzerAgent] 원본 응답:`, {
        response: response,
      });
      throw new Error(
        `AI 응답 파싱 실패: ${parseError instanceof Error ? parseError.message : String(parseError)}`
      );
    }
  }

  /**
   * 에러 타입 추정 (AI 분석 실패 시 대체)
   */
  private estimateErrorType(error: Error): ErrorType {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || "";

    if (message.includes("null") || message.includes("undefined")) {
      return ErrorType.NULL_REFERENCE;
    }

    if (
      message.includes("element") ||
      message.includes("dom") ||
      message.includes("getelementbyid")
    ) {
      return ErrorType.ELEMENT_NOT_FOUND;
    }

    if (
      message.includes("network") ||
      message.includes("fetch") ||
      message.includes("http")
    ) {
      return ErrorType.NETWORK_ERROR;
    }

    if (
      message.includes("type") ||
      message.includes("cannot read") ||
      message.includes("is not a function")
    ) {
      return ErrorType.TYPE_ERROR;
    }

    if (message.includes("timeout")) {
      return ErrorType.TIMEOUT_ERROR;
    }

    if (
      message.includes("auth") ||
      message.includes("unauthorized") ||
      message.includes("forbidden")
    ) {
      return ErrorType.AUTHENTICATION_ERROR;
    }

    return ErrorType.UNKNOWN_ERROR;
  }

  /**
   * 에러 심각도 추정 (AI 분석 실패 시 대체)
   */
  private estimateErrorSeverity(
    error: Error,
    context: ErrorContext
  ): ErrorSeverity {
    const errorType = this.estimateErrorType(error);

    // DOM 관련 에러는 보통 중간 정도의 심각도
    if (
      [ErrorType.NULL_REFERENCE, ErrorType.ELEMENT_NOT_FOUND].includes(
        errorType
      )
    ) {
      return ErrorSeverity.MEDIUM;
    }

    // 네트워크 에러는 높은 심각도
    if (
      [ErrorType.NETWORK_ERROR, ErrorType.API_RESPONSE_ERROR].includes(
        errorType
      )
    ) {
      return ErrorSeverity.HIGH;
    }

    // 인증 에러는 높은 심각도
    if (errorType === ErrorType.AUTHENTICATION_ERROR) {
      return ErrorSeverity.HIGH;
    }

    // 타입 에러는 보통 낮은 심각도
    if (
      [ErrorType.TYPE_ERROR, ErrorType.VALIDATION_ERROR].includes(errorType)
    ) {
      return ErrorSeverity.LOW;
    }

    return ErrorSeverity.MEDIUM;
  }

  /**
   * 근본 원인 추정 (AI 분석 실패 시 대체)
   */
  private estimateRootCause(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes("null") || message.includes("undefined")) {
      return "DOM 요소가 존재하지 않거나 초기화되지 않았습니다";
    }

    if (message.includes("element") || message.includes("dom")) {
      return "요청한 DOM 요소를 찾을 수 없습니다";
    }

    if (message.includes("network") || message.includes("fetch")) {
      return "네트워크 연결 문제 또는 API 서버 오류가 발생했습니다";
    }

    if (message.includes("type") || message.includes("cannot read")) {
      return "변수나 객체의 타입이 예상과 다르거나 정의되지 않았습니다";
    }

    if (message.includes("timeout")) {
      return "요청이 시간 초과되었습니다";
    }

    if (message.includes("auth")) {
      return "인증 정보가 유효하지 않거나 만료되었습니다";
    }

    return "알 수 없는 오류가 발생했습니다";
  }

  /**
   * 대체 해결 방법 생성 (AI 분석 실패 시)
   */
  private generateFallbackSolution(error: Error): ErrorAnalysis["solution"] {
    const errorType = this.estimateErrorType(error);

    switch (errorType) {
      case ErrorType.NULL_REFERENCE:
        return {
          description:
            "DOM 요소 존재 여부를 확인하고 안전한 접근 방법을 사용합니다",
          codeChanges: [
            {
              file: "navo/web/app.js",
              action: "modify",
              content: "// null 체크 추가 예시",
              reason: "DOM 요소 접근 전 null 체크가 필요합니다",
            },
          ],
          estimatedTime: 30,
          autoRecoverable: true,
        };

      case ErrorType.ELEMENT_NOT_FOUND:
        return {
          description:
            "요청한 DOM 요소를 찾을 수 없습니다. 요소 ID나 선택자를 확인하세요",
          codeChanges: [
            {
              file: "navo/web/index.html",
              action: "modify",
              content: "<!-- 누락된 요소 추가 -->",
              reason: "HTML에 필요한 요소가 정의되지 않았습니다",
            },
          ],
          estimatedTime: 45,
          autoRecoverable: true,
        };

      case ErrorType.NETWORK_ERROR:
        return {
          description:
            "네트워크 연결을 확인하고 API 엔드포인트 상태를 점검하세요",
          codeChanges: [
            {
              file: "navo/web/app.js",
              action: "modify",
              content: "// 에러 처리 및 재시도 로직 추가",
              reason: "네트워크 오류에 대한 적절한 처리가 필요합니다",
            },
          ],
          estimatedTime: 60,
          autoRecoverable: false,
        };

      default:
        return {
          description:
            "일반적인 오류입니다. 콘솔 로그를 확인하고 수동으로 디버깅하세요",
          codeChanges: [],
          estimatedTime: 120,
          autoRecoverable: false,
        };
    }
  }

  /**
   * 에러 스택에서 파일 경로와 라인 번호를 파싱합니다.
   */
  private parseErrorStack(error: Error): {
    filePath?: string;
    lineNumber?: number;
  } {
    const stack = error.stack;
    if (!stack) {
      return {};
    }

    // Example stack trace line: "    at myFunction (file:///path/to/your/file.js:10:20)"
    // or "    at /path/to/your/file.js:10:20"
    const lineMatch = stack.match(
      /(?:at\s+\S+\s+\()?(?:file:\/\/\/)?([^:]+):(\d+):(?:\d+)\)?/
    );
    if (lineMatch && lineMatch[1] && lineMatch[2]) {
      return {
        filePath: lineMatch[1],
        lineNumber: parseInt(lineMatch[2], 10),
      };
    }
    return {};
  }

  /**
   * 분석 결과를 바탕으로 해결 방법 생성
   */
  private generateSolutionFromAnalysis(
    analysis: ErrorAnalysis
  ): ErrorAnalysis["solution"] {
    return analysis.solution;
  }

  /**
   * 최근 커밋 히스토리를 가져옵니다.
   */
  private async fetchCommitHistory(filePath?: string): Promise<string> {
    try {
      let command = 'git log -1 --pretty=format:"%h - %an, %ar : %s"'; // Get last commit
      if (filePath) {
        command += ` -- ${filePath}`;
      }
      const { stdout } = await exec(command);
      if (stdout) {
        return `

Recent Commit History:

${stdout}
`;
      }
    } catch (e) {
      this.logger.warn(
        `[ErrorAnalyzerAgent] Failed to fetch commit history: ${e instanceof Error ? e.message : String(e)}`
      );
    }
    return "";
  }

  /**
   * 동적 컨텍스트 (코드 스니펫, 커밋 히스토리, 로그 등)를 가져옵니다.
   */
  private async fetchDynamicContext(
    error: Error,
    context: ErrorContext
  ): Promise<string> {
    let dynamicContext = "";

    const { filePath, lineNumber } = this.parseErrorStack(error);

    if (filePath && lineNumber) {
      try {
        // Read 5 lines before and 5 lines after the error line
        const linesToRead = 11; // 5 before + 1 error line + 5 after
        const offset = Math.max(0, lineNumber - 6); // 0-based index, so lineNumber - 1 - 5
        const content = await fs.readFile(filePath, "utf8");
        const lines = content.split("\n");
        const snippet = lines
          .slice(offset, Math.min(lines.length, offset + linesToRead))
          .join("\n");
        dynamicContext += `

Relevant Code Snippet from ${filePath} (lines ${offset + 1}-${offset + linesToRead}):

${snippet}
`;
      } catch (e) {
        this.logger.warn(
          `[ErrorAnalyzerAgent] Failed to read code snippet for ${filePath}:${lineNumber}: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }

    // Fetch commit history
    dynamicContext += await this.fetchCommitHistory(filePath);

    // Fetch log entries
    dynamicContext += await this.fetchLogEntries(context);

    if (!dynamicContext) {
      dynamicContext = `

Dynamic Context (Placeholder):
- No additional dynamic context fetched yet.
`;
    }

    return dynamicContext;
  }

  /**
   * 관련 로그 항목을 가져옵니다.
   */
  private async fetchLogEntries(context: ErrorContext): Promise<string> {
    // No external log provider wired. Return empty string to keep prompt concise.
    return "";
  }
}
