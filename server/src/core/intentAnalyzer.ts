import { GoogleGenerativeAI } from "@google/generative-ai";

import { ChatMessage, UserContext } from "@/core/contextManager";
// Fallback stub until ai/utils are available
const parseJsonFromMarkdown = (raw: string): any => {
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(raw.slice(start, end + 1));
    }
  } catch {}
  return {};
};
import {
  buildSystemInstruction,
  buildUserPrompt,
  decideExecution,
  normalizeModelAnalysis,
} from "@/core/intentUtils.fallback";
import { EnhancedPrompt, IntentAnalysis } from "@/core/types/intent";

export class IntentAnalyzer {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private readonly modelName = "gemini-2.5-flash";

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: this.modelName });
  }

  public async analyzeIntent(
    message: string,
    userContext: UserContext,
    recentMessages?: ChatMessage[]
  ): Promise<IntentAnalysis> {
    const domain = await this.classifyDomain(message);
    const fullContext = this.buildContextInfo(userContext, recentMessages);
    const selectedContext = this.selectContextForDomain(domain, fullContext);

    const systemInstruction = buildSystemInstruction(domain);
    const userPrompt = buildUserPrompt(message, selectedContext);
    const fullPrompt = `SYSTEM:
${systemInstruction}

USER:
${userPrompt}`;

    try {
      const result = await this.model.generateContent(fullPrompt);
      const raw = result.response.text();

      const parsed = parseJsonFromMarkdown(raw);
      const normalized = normalizeModelAnalysis(parsed);
      const decision = decideExecution(normalized, userContext);

      // --- Safe Fallback Logic ---
      const shouldFallback =
        domain === "project_management" &&
        (decision.status === "blocked" ||
          (decision.status === "manual" && normalized.is_vague));

      if (shouldFallback) {
        return {
          domain: "project_management",
          type: "clarification",
          confidence: 0.9,
          description: `Request is blocked or too vague. Proposing a safe fallback action: create a new page. Original reason: ${decision.reason}`,
          isVague: false,
          status: "manual", // Requires user confirmation
          reason: "fallback_to_safe_action",
          actions: [
            {
              type: "project.add_pages",
              parameters: { name: "new-page-from-fallback" },
              description: "Create a new page as a safe alternative.",
            },
          ],
        } as any;
      }

      const out: IntentAnalysis = {
        domain,
        type: normalized.type,
        confidence: normalized.confidence,
        description: normalized.description,
        isVague: normalized.is_vague,
        clarification: undefined,
        targets: normalized.targets,
        actions: normalized.actions,
        required_fields: normalized.required_fields,
        blocking_reasons: normalized.blocking_reasons,
        routing_key: normalized.routing_key,
        status: decision.status,
        reason: decision.reason,
        missing: decision.missing,
        enhancedMessage: normalized.enhanced_message,
      } as any;

      return out;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("analyzeIntent failed:", msg.slice(0, 300));
      return {
        domain,
        type: "general",
        confidence: 0.5,
        description: "의도 분석 실패, 기본값",
        isVague: true,
        status: "manual",
        reason: "parse_or_model_error",
      } as any;
    }
  }

  private buildContextInfo(
    userContext: UserContext,
    recentMessages?: ChatMessage[]
  ): any {
    return {
      user: userContext,
      recentMessages: recentMessages || [],
      timestamp: new Date().toISOString(),
    };
  }

  private selectContextForDomain(domain: string, fullContext: any): any {
    if (domain === "project_management") {
      return {
        user: fullContext.user,
        recentMessages: fullContext.recentMessages.slice(-5), // Last 5 messages
        timestamp: fullContext.timestamp,
      };
    }
    return {
      user: fullContext.user,
      timestamp: fullContext.timestamp,
    };
  }

  private async classifyDomain(
    message: string
  ): Promise<"project_management" | "general_conversation"> {
    const prompt = `
      Analyze the user's message and classify it into one of the following two categories:
      - project_management: Messages related to creating, modifying, or managing projects
      - general_conversation: All other messages

      Message: "${message}"

      Respond with only the category name.
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      return response.trim() === "project_management"
        ? "project_management"
        : "general_conversation";
    } catch (error) {
      console.error("Domain classification failed:", error);
      return "general_conversation";
    }
  }
}
