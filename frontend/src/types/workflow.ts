/**
 * @file Frontend type definitions for Phase 1.1 Propose-and-Approve workflow
 * Mirrors backend types from server/src/modules/workflow/types.ts
 * Design spec: docs/plan/009_phase_1_1_api_design.md
 */

/**
 * Unified response type for all workflow-related requests.
 * The frontend must handle each type appropriately.
 */
export type WorkflowResponse =
  | ExecutionStartedResponse
  | ProposalRequiredResponse
  | ClarificationNeededResponse
  | ErrorResponse;

/**
 * Returned when the AI decides to execute the plan immediately.
 * Frontend should establish SSE connection to track progress.
 */
export interface ExecutionStartedResponse {
  type: 'EXECUTION_STARTED';
  runId: string;
  sseUrl: string;
  planSummary: PlanSummary;
}

/**
 * Returned when the AI determines that user approval is required.
 * Frontend should display the proposal and wait for user action.
 */
export interface ProposalRequiredResponse {
  type: 'PROPOSAL_REQUIRED';
  proposalId: string;
  reasoning: string;
  planSummary: PlanSummary;
  confidence: number; // 0.0 to 1.0
}

/**
 * (Future) Returned when the AI needs more information from the user.
 */
export interface ClarificationNeededResponse {
  type: 'CLARIFICATION_NEEDED';
  questions: Array<{
    id: string;
    question: string;
    type: 'text' | 'choice';
    choices?: string[];
  }>;
  context: string;
}

/**
 * Returned when an error occurs during planning or execution.
 */
export interface ErrorResponse {
  type: 'ERROR';
  errorCode: string;
  message: string;
  retryable: boolean;
}

/**
 * A summarized version of a Plan, safe to display in the frontend.
 */
export interface PlanSummary {
  name: string;
  description: string;
  steps: Array<{
    id: string;
    title: string;
    description: string;
    tool: string;
  }>;
  estimatedDuration: number; // in milliseconds
}

/**
 * Error codes that can be returned by the backend
 */
export const WorkflowErrorCodes = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  PROPOSAL_NOT_FOUND: 'PROPOSAL_NOT_FOUND',
  PROPOSAL_EXPIRED: 'PROPOSAL_EXPIRED',
  EXECUTION_FAILED: 'EXECUTION_FAILED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  RATE_LIMITED: 'RATE_LIMITED',
} as const;

export type WorkflowErrorCode = typeof WorkflowErrorCodes[keyof typeof WorkflowErrorCodes];

/**
 * Confidence level for UI visualization
 */
export enum ConfidenceLevel {
  HIGH = 'high',    // 95-100%
  MEDIUM = 'medium', // 75-94%
  LOW = 'low',      // <75%
}

/**
 * Helper function to determine confidence level from score
 */
export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.95) return ConfidenceLevel.HIGH;
  if (confidence >= 0.75) return ConfidenceLevel.MEDIUM;
  return ConfidenceLevel.LOW;
}

/**
 * UI-friendly confidence info
 */
export interface ConfidenceInfo {
  level: ConfidenceLevel;
  percentage: number;
  color: 'green' | 'yellow' | 'orange';
  label: string;
  message: string;
}

/**
 * Get confidence info for UI display
 */
export function getConfidenceInfo(confidence: number): ConfidenceInfo {
  const level = getConfidenceLevel(confidence);
  const percentage = Math.round(confidence * 100);

  switch (level) {
    case ConfidenceLevel.HIGH:
      return {
        level,
        percentage,
        color: 'green',
        label: 'High Confidence',
        message: 'The AI is very confident in this plan.',
      };
    case ConfidenceLevel.MEDIUM:
      return {
        level,
        percentage,
        color: 'yellow',
        label: 'Medium Confidence',
        message: 'The AI is reasonably confident, but your review is recommended.',
      };
    case ConfidenceLevel.LOW:
      return {
        level,
        percentage,
        color: 'orange',
        label: 'Low Confidence',
        message: 'The AI is uncertain about this plan. Please review carefully.',
      };
  }
}
