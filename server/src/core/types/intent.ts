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

export interface IntentAnalysis {
  type: IntentType;
  confidence: number;
  description: string;
  isVague: boolean;
  clarification?: string;
  targets?: TargetMeta[];
  actions?: ActionMeta[];
  required_fields?: string[];
  blocking_reasons?: string[];
  routing_key?: string;
  status?: ExecutionStatus;
  reason?: string;
  missing?: string[];
  enhancedMessage?: string;
}

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
}
