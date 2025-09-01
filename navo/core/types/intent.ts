/*
 * Intent Analysis Types
 * 의도 분석에 사용되는 모든 타입 정의
 */

// -----------------------------
// Core Types
// -----------------------------
export type IntentType =
    | "project_creation"
    | "site_planning"
    | "site_composition"
    | "page_creation"
    | "component_creation"
    | "page_modification"
    | "component_modification"
    | "code_review"
    | "bug_fix"
    | "feature_request"
    | "question"
    | "complaint"
    | "general";

export type TargetScope = "project" | "page" | "component" | "code" | "unknown";
export type TargetAction =
    | "create"
    | "modify"
    | "fix"
    | "review"
    | "ask"
    | "request"
    | "complain"
    | "none";

export type ExecutionStatus = "auto_execute" | "blocked" | "manual" | "clarify";

// -----------------------------
// Meta Types
// -----------------------------
export interface TargetMeta {
    scope: TargetScope;
    name: string;
    action: TargetAction;
    id?: string;
    description?: string;
}

export interface ActionMeta {
    type: string;
    parameters: Record<string, any>;
    description: string;
    priority: number;
}

// -----------------------------
// Analysis Types
// -----------------------------
export interface ModelAnalysis {
    type: IntentType;
    confidence: number; // 0.0 ~ 1.0
    description: string; // <= 140 chars 권장
    is_vague: boolean;
    targets: TargetMeta[];
    actions: ActionMeta[];
    required_fields: string[]; // 실행 전에 반드시 필요한 필드들
    blocking_reasons: string[]; // 왜 지금은 실행 불가인지
    routing_key: string;
    enhanced_message?: string; // 향상된 메시지
}

export interface IntentAnalysis {
    type: IntentType;
    confidence: number;
    description: string;
    isVague: boolean;
    clarification?: string; // 유지(하위 호환)
    targets?: TargetMeta[];
    actions?: ActionMeta[];
    required_fields?: string[];
    blocking_reasons?: string[];
    routing_key?: string;
    status?: ExecutionStatus; // 정책 결과
    reason?: string; // blocked/manual 사유
    missing?: string[]; // 누락 필드
    enhancedMessage?: string; // 향상된 메시지
}

// -----------------------------
// Enhanced Prompt Types
// -----------------------------
export interface EnhancedPrompt {
    originalMessage: string;
    enhancedMessage: string;
    intent: {
        type: string;
        confidence: number;
        description: string;
        isVague?: boolean;
        clarification?: string;
    };
    target: {
        type: string;
        id?: string;
        name?: string;
        description?: string;
    };
    action: {
        type: string;
        parameters: Record<string, any>;
        description: string;
    };
    context: {
        projectContext?: string;
        componentContext?: string;
        conversationContext?: string;
    };
    metadata: {
        model: string;
        tokens: number;
        processingTime: number;
        timestamp: Date;
    };
}

// -----------------------------
// Execution Policy Types
// -----------------------------
export interface ExecutionDecision {
    status: ExecutionStatus;
    reason?: string;
    missing?: string[];
}

// -----------------------------
// Context Types
// -----------------------------
export interface ContextInfo {
    projectContext?: string;
    componentContext?: string;
    conversationContext?: string;
}
