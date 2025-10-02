/**
 * @file Workflow API client
 * Handles communication with workflow endpoints and response processing
 */

import type { WorkflowResponse } from '@/types/workflow';

/**
 * Send a message to the workflow API
 * Returns WorkflowResponse which the caller must handle appropriately
 */
export async function sendWorkflowMessage(
  projectId: string,
  prompt: string,
  chatHistory: any[],
  context: any,
  token: string
): Promise<WorkflowResponse> {
  const response = await fetch(`/api/projects/${projectId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      prompt,
      chatHistory,
      context,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  const workflowResponse: WorkflowResponse = await response.json();
  return workflowResponse;
}

/**
 * Handle WorkflowResponse and return appropriate actions
 */
export function handleWorkflowResponse(
  response: WorkflowResponse,
  callbacks: {
    onExecutionStarted?: (runId: string, sseUrl: string) => void;
    onProposalRequired?: (proposal: any) => void;
    onClarificationNeeded?: (questions: any[]) => void;
    onError?: (errorCode: string, message: string, retryable: boolean) => void;
  }
): void {
  switch (response.type) {
    case 'EXECUTION_STARTED':
      console.log('✅ Execution started:', response.runId);
      callbacks.onExecutionStarted?.(response.runId, response.sseUrl);
      break;

    case 'PROPOSAL_REQUIRED':
      console.log('📋 Proposal required:', response.proposalId);
      callbacks.onProposalRequired?.(response);
      break;

    case 'CLARIFICATION_NEEDED':
      console.log('❓ Clarification needed:', response.questions);
      callbacks.onClarificationNeeded?.(response.questions);
      break;

    case 'ERROR':
      console.error('❌ Workflow error:', response.errorCode, response.message);
      callbacks.onError?.(response.errorCode, response.message, response.retryable);
      break;

    default:
      console.warn('⚠️ Unknown response type:', (response as any).type);
  }
}
