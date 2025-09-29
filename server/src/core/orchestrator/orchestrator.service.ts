import * as fs from "node:fs";
import * as path from "node:path";
import { FastifyInstance } from "fastify";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { WorkflowService } from "@/modules/workflow/workflow.service";
import { ProjectsService } from "@/modules/projects/projects.service";
import { PromptLoader } from "@/lib/promptLoader";
import { ChatErrorHandler, ChatErrorType } from "../chatErrorHandler";
import { connectionManager } from "@/modules/workflow/workflow.controller";

// JSON 파싱 유틸리티 함수
function parseJsonFromMarkdown(text: string): any {
  try {
    // 마크다운 코드 블록에서 JSON 추출
    const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }

    // 마크다운 없이 직접 JSON인 경우
    return JSON.parse(text);
  } catch (error) {
    console.error("Failed to parse JSON from markdown:", error);
    return null;
  }
}

interface AnalysisResult {
  intent: string | string[];
  complexity: "simple" | "complex";
  confidence: number;
  summary: string;
}

export class OrchestratorService {
  private app: FastifyInstance;
  private model: any;
  private workflowService: WorkflowService;
  private projectsService: ProjectsService;
  private chatErrorHandler: ChatErrorHandler;

  constructor(app: FastifyInstance) {
    this.app = app;
    const modelName = "gemini-2.5-flash";
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    this.model = genAI.getGenerativeModel({ model: modelName });
    this.workflowService = new WorkflowService(app);
    this.projectsService = new ProjectsService(app);
    this.chatErrorHandler = new ChatErrorHandler(app);
  }

  async handleRequest(
    prompt: string,
    user: { id: string },
    chatHistory: any[],
    projectId?: string
  ): Promise<any> {
    try {
      this.app.log.info(
        { prompt },
        `[Orchestrator] Analyzing prompt with history.`
      );
      const analysis = await this.analyzeIntent(prompt, chatHistory);
      this.app.log.info(
        { analysis },
        "[Orchestrator] Intent analysis complete"
      );

      const intents = Array.isArray(analysis.intent)
        ? analysis.intent
        : [analysis.intent];

      if (
        intents.includes("project_modification") ||
        intents.includes("create_project")
      ) {
        const primaryIntent = intents.includes("project_modification")
          ? "project_modification"
          : "create_project";
        this.app.log.info(
          `[Orchestrator] Routing primary intent '${primaryIntent}' to Workflow Engine.`
        );

        try {
          const plan = await this.workflowService.preparePlan(
            prompt,
            user,
            chatHistory,
            projectId
          );
          const executionResult = await this.workflowService.executePlan(
            plan,
            user,
            projectId
          );

          return {
            type: "WORKFLOW_RESULT",
            payload: {
              ...executionResult,
              summaryMessage:
                "요청하신 작업이 완료되었습니다. 파일 트리와 미리보기를 확인해주세요.",
            },
          };
        } catch (error) {
          this.app.log.warn(
            error,
            `[Orchestrator] Workflow failed for intent '${primaryIntent}', falling back to Lightweight Responder.`
          );

          // 워크플로우 실패 시 Lightweight Responder로 폴백
          const fallbackResponse = await this.generateSimpleResponse(
            prompt,
            chatHistory,
            projectId
          );

          return {
            type: "SIMPLE_CHAT",
            payload: {
              ...fallbackResponse,
              message: `죄송합니다. 요청하신 작업을 처리하는 중에 문제가 발생했습니다. ${fallbackResponse.message}`,
              isFallback: true,
              originalIntent: primaryIntent,
              error: error instanceof Error ? error.message : String(error),
            },
          };
        }
      } else {
        this.app.log.info(
          "[Orchestrator] Routing to Lightweight Responder for simple chat."
        );
        const simpleResponse = await this.generateSimpleResponse(
          prompt,
          chatHistory,
          projectId
        );
        if (simpleResponse.actions && simpleResponse.actions.length > 0) {
          return {
            type: "PROPOSAL",
            payload: simpleResponse,
          };
        }

        return {
          type: "SIMPLE_CHAT",
          payload: simpleResponse,
        };
      }
    } catch (error) {
      // SSE로 에러 메시지 전송 (백그라운드 처리)
      if (projectId) {
        const errorMessage = await this.chatErrorHandler.handleChatError(
          error as Error,
          {
            userPrompt: prompt,
            userIntent: analysis?.intent,
            projectId,
            userId: user.id,
            chatHistory,
          }
        );

        connectionManager.broadcast(projectId, {
          type: "AI_RESPONSE_ERROR",
          message: errorMessage.content,
          error: errorMessage.originalError,
          errorType: errorMessage.errorType,
        });
      }

      // 에러를 다시 던지지 않고 안전하게 처리
      this.app.log.error(
        error,
        "[Orchestrator] Critical error occurred, returning error response"
      );

      return {
        type: "SIMPLE_CHAT",
        payload: {
          message: errorMessage.content,
          isError: true,
          errorType: errorMessage.errorType,
          originalError: errorMessage.originalError,
        },
      };
    }
  }

  private async analyzeIntent(
    prompt: string,
    chatHistory: any[]
  ): Promise<AnalysisResult> {
    const analysisPrompt = PromptLoader.render("orchestrator.prompt.txt", {
      chatHistory: JSON.stringify(chatHistory, null, 2),
      prompt: prompt,
    });

    try {
      const result = await this.model.generateContent(analysisPrompt);
      const raw = result.response.text();
      const parsed = parseJsonFromMarkdown(raw);

      if (!parsed) {
        throw new Error("Failed to parse JSON from AI response");
      }

      if (parsed && typeof parsed === "object") {
        return {
          intent: parsed.intent || "unknown",
          complexity: parsed.complexity || "simple",
          confidence: parsed.confidence || 0.0,
          summary: parsed.summary || "Intent analysis completed.",
        };
      }

      throw new Error("Invalid analysis result format");
    } catch (error) {
      this.app.log.error(error, "[Orchestrator] Failed to analyze intent.");
      return {
        intent: "unknown",
        complexity: "simple",
        confidence: 0.0,
        summary: "Intent analysis failed.",
      };
    }
  }

  private async generateSimpleResponse(
    prompt: string,
    chatHistory: any[],
    projectId?: string
  ): Promise<{ message: string; actions?: any[] }> {
    // 프로젝트 상태 조회
    let projectContext = "";
    if (projectId) {
      try {
        const project = await this.projectsService.getProject(projectId);
        if (project) {
          projectContext = `\n\n**현재 프로젝트 정보:**\n- 프로젝트명: ${
            project.name
          }\n- 설명: ${project.description || "설명 없음"}\n- 생성일: ${
            project.createdAt
          }`;
        }
      } catch (error) {
        this.app.log.warn(error, "프로젝트 정보 조회 실패");
      }
    }

    const chatPrompt = PromptLoader.render("simple-chat.prompt.txt", {
      chatHistory: JSON.stringify(chatHistory, null, 2),
      prompt: prompt,
      projectContext: projectContext,
    });

    try {
      const result = await this.model.generateContent(chatPrompt);
      const text = result.response
        .text()
        .replace(/```json|```/g, "")
        .trim();
      const parsed = JSON.parse(text);
      return parsed;
    } catch (error) {
      this.app.log.error(
        error,
        "[Orchestrator] Failed to generate simple response."
      );
      return { message: "죄송합니다. 답변을 생성하는 데 문제가 발생했습니다." };
    }
  }
}
