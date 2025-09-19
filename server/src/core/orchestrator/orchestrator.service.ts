import * as fs from "node:fs";
import * as path from "node:path";
import { FastifyInstance } from "fastify";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { WorkflowService } from "@/modules/workflow/workflow.service";
import { ProjectsService } from "@/modules/projects/projects.service";
import { PromptLoader } from "@/lib/promptLoader";
import { normalizeModelAnalysis } from "../intentUtils.fallback";
import { refineJsonResponse } from "@/modules/workflow/utils/jsonRefiner";

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

  constructor(app: FastifyInstance) {
    this.app = app;
    const modelName = "gemini-2.5-flash";
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    this.model = genAI.getGenerativeModel({ model: modelName });
    this.workflowService = new WorkflowService(app);
    this.projectsService = new ProjectsService(app);
  }

  async handleRequest(
    prompt: string,
    user: { id: string },
    chatHistory: any[],
    projectId?: string
  ): Promise<any> {
    this.app.log.info(
      { prompt },
      `[Orchestrator] Analyzing prompt with history.`
    );
    const analysis = await this.analyzeIntent(prompt, chatHistory);
    this.app.log.info({ analysis }, "[Orchestrator] Intent analysis complete");

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
    } else {
      this.app.log.info(
        "[Orchestrator] Routing to Lightweight Responder for simple chat."
      );
      const simpleResponse = await this.generateSimpleResponse(
        prompt,
        chatHistory
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
  }

  private async analyzeIntent(
    prompt: string,
    chatHistory: any[]
  ): Promise<AnalysisResult> {
    const analysisPrompt = PromptLoader.render("intent-analysis.prompt.txt", {
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

      const normalized = normalizeModelAnalysis(parsed);

      if (normalized && typeof normalized === "object") {
        return {
          intent: normalized.intent || "unknown",
          complexity: normalized.complexity || "simple",
          confidence: normalized.confidence || 0.0,
          summary: normalized.summary || "Intent analysis completed.",
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
    chatHistory: any[]
  ): Promise<{ message: string; actions?: any[] }> {
    const chatPrompt = PromptLoader.render("simple-chat.prompt.txt", {
      chatHistory: JSON.stringify(chatHistory, null, 2),
      prompt: prompt,
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
