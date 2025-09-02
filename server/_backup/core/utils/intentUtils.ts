/*
 * Intent Analysis Utilities
 * 의도 분석에 사용되는 유틸리티 함수들
 */

import {
    IntentType,
    TargetScope,
    TargetAction,
    TargetMeta,
    ActionMeta,
    ModelAnalysis,
    ExecutionDecision,
    ContextInfo,
} from '../types/intent.js';

// -----------------------------
// Constants
// -----------------------------
const ALLOWED_TYPES: IntentType[] = [
    "project_creation",
    "page_creation",
    "component_creation",
    "page_modification",
    "component_modification",
    "code_review",
    "bug_fix",
    "feature_request",
    "question",
    "complaint",
    "general",
];

const ALLOWED_SCOPES: TargetScope[] = ["project", "page", "component", "code", "unknown"];
const ALLOWED_ACTIONS: TargetAction[] = [
    "create",
    "modify",
    "fix",
    "review",
    "ask",
    "request",
    "complain",
    "none",
];

// -----------------------------
// Normalization Functions
// -----------------------------
export function normalizeTarget(t: any): TargetMeta {
    return {
        scope: ALLOWED_SCOPES.includes(t?.scope) ? t.scope : "unknown",
        name: typeof t?.name === "string" ? t.name : "",
        action: ALLOWED_ACTIONS.includes(t?.action) ? t.action : "none",
        id: typeof t?.id === "string" ? t.id : undefined,
        description: typeof t?.description === "string" ? t.description : undefined,
    };
}

export function normalizeAction(a: any): ActionMeta {
    return {
        type: typeof a?.type === "string" ? a.type : "explain",
        parameters: typeof a?.parameters === "object" ? a.parameters : {},
        description: typeof a?.description === "string" ? a.description : "액션 분석 완료",
        priority: typeof a?.priority === "number" ? a.priority : 1,
    };
}

export function normalizeModelAnalysis(obj: any): ModelAnalysis {
    const type: IntentType = ALLOWED_TYPES.includes(obj?.type) ? obj.type : "general";
    const confidence =
        typeof obj?.confidence === "number" && obj.confidence >= 0 && obj.confidence <= 1
            ? obj.confidence
            : 0.8;
    const description =
        typeof obj?.description === "string" && obj.description.length > 0
            ? String(obj.description).slice(0, 140)
            : "의도 분석 결과";
    const is_vague = typeof obj?.is_vague === "boolean" ? obj.is_vague : !!obj?.isVague;

    const targets: TargetMeta[] = Array.isArray(obj?.targets) && obj.targets.length > 0
        ? obj.targets.map(normalizeTarget)
        : [{ scope: "unknown", name: "", action: "none" }];

    const actions: ActionMeta[] = Array.isArray(obj?.actions) && obj.actions.length > 0
        ? obj.actions.map(normalizeAction)
        : [{ type: "explain", parameters: {}, description: "기본 액션", priority: 1 }];

    const required_fields: string[] = Array.isArray(obj?.required_fields)
        ? obj.required_fields.filter((s: any) => typeof s === "string")
        : [];

    const blocking_reasons: string[] = Array.isArray(obj?.blocking_reasons)
        ? obj.blocking_reasons.filter((s: any) => typeof s === "string")
        : [];

    const routing_key: string = typeof obj?.routing_key === "string" ? obj.routing_key : "";
    const enhanced_message: string = typeof obj?.enhanced_message === "string" ? obj.enhanced_message : "";

    return {
        type,
        confidence,
        description,
        is_vague,
        targets,
        actions,
        required_fields,
        blocking_reasons,
        routing_key,
        enhanced_message
    };
}

// -----------------------------
// Execution Policy Functions
// -----------------------------
export function decideExecution(ia: ModelAnalysis): ExecutionDecision {
    const nonExecutable = new Set<IntentType>([
        "project_creation",
        "code_review",
        "question",
        "complaint",
        "general",
    ]);

    if (nonExecutable.has(ia.type)) {
        return { status: "manual", reason: "non-executable intent" };
    }

    const blocks: string[] = [];
    if (ia.confidence < 0.85) blocks.push("low_confidence");
    if (ia.is_vague) blocks.push("vague_intent");
    if (ia.required_fields.length) blocks.push("missing_required_fields");
    const scope = ia.targets?.[0]?.scope ?? "unknown";
    if (!(["page", "component"] as TargetScope[]).includes(scope)) blocks.push("unsafe_scope");

    if (blocks.length) {
        return { status: "blocked", reason: blocks.join(","), missing: ia.required_fields };
    }

    return { status: "auto_execute" };
}

// -----------------------------
// Prompt Building Functions
// -----------------------------
export function buildSystemInstruction(): string {
    return (
        `You are an Intent Classification and Enhancement Agent. Output STRICT JSON only. No code fences.\n\n` +
        `Rules:\n` +
        `- Classify intent into exactly one type:\n` +
        `  project_creation | page_creation | component_creation |\n` +
        `  page_modification | component_modification |\n` +
        `  bug_fix | feature_request | code_review |\n` +
        `  question | complaint | general\n` +
        `- Prefer the most directly actionable type (priority: bug_fix > code_review > feature_request > page_/component_modification > page_/component_creation > project_creation > question > complaint > general).\n` +
        `- If any critical info is missing for safe execution, list it in \\\"required_fields\\\".\n` +
        `- If execution should not proceed yet, add brief reasons in \\\"blocking_reasons\\\".\n` +
        `- Generate an enhanced_message that clarifies the user's intent.\n` +
        `- Do not hallucinate. Unknowns => empty string/array.\n` +
        `- Valid scopes: project|page|component|code|unknown.\n` +
        `- Output must match the schema exactly. No extra keys.\n\n` +
        `Schema:\n` +
        `{\n` +
        `  \"type\": \"project_creation|page_creation|component_creation|page_modification|component_modification|code_review|bug_fix|feature_request|question|complaint|general\",\n` +
        `  \"confidence\": 0.0,\n` +
        `  \"description\": \"string\",\n` +
        `  \"is_vague\": false,\n` +
        `  \"targets\": [\n` +
        `    { \"scope\": \"project|page|component|code|unknown\", \"name\": \"string\", \"action\": \"create|modify|fix|review|ask|request|complain|none\", \"id\": \"string\", \"description\": \"string\" }\n` +
        `  ],\n` +
        `  \"actions\": [\n` +
        `    { \"type\": \"string\", \"parameters\": {}, \"description\": \"string\", \"priority\": 1 }\n` +
        `  ],\n` +
        `  \"required_fields\": [\"string\"],\n` +
        `  \"blocking_reasons\": [\"string\"],\n` +
        `  \"routing_key\": \"string\",\n` +
        `  \"enhanced_message\": \"string\"\n` +
        `}`
    ).trim();
}

export function buildUserPrompt(message: string, contextInfo: ContextInfo): string {
    return (
        `Context:\n` +
        `- projectContext: ${contextInfo?.projectContext ?? ""}\n` +
        `- componentContext: ${contextInfo?.componentContext ?? ""}\n` +
        `- conversationContext: ${contextInfo?.conversationContext ?? ""}\n\n` +
        `User Message: "${message}"\n\n` +
        `Analyze the intent, identify targets and actions, and generate an enhanced message that clarifies the user's request.\n\n` +
        `Return ONLY the JSON object.`
    ).trim();
}
