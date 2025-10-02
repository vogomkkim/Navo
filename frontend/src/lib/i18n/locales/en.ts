/**
 * English messages
 */
import { TranslationKeys } from './ko';

export const en: TranslationKeys = {
  // Workflow messages
  workflow: {
    planCreated: 'Plan has been created.',
    executionStarted: 'Workflow execution started.',
    executionComplete: 'Workflow completed successfully.',
    proposalGenerated: 'Proposal generated. Please review and approve.',
    clarificationNeeded: 'Additional information required.',
  },

  // Proposal messages
  proposal: {
    title: '💡 AI Proposal',
    description: 'AI has proposed the following plan:',
    reasoning: 'Reasoning',
    steps: 'Execution Steps',
    estimatedDuration: 'Estimated Duration',
    approve: 'Approve',
    reject: 'Reject',
    approving: 'Approving...',
    rejecting: 'Rejecting...',
    confidence: 'Confidence',
  },

  // Error messages
  error: {
    workflowFailed: 'An error occurred during workflow execution.',
    planGenerationFailed: 'Failed to generate plan.',
    proposalNotFound: 'Proposal not found.',
    unauthorized: 'Unauthorized.',
    networkError: 'Network error occurred.',
    unexpectedError: 'An unexpected error occurred.',
    retryAvailable: 'You can try again.',
  },

  // Step status messages
  stepStatus: {
    pending: 'Pending',
    running: 'Running',
    completed: 'Completed',
    failed: 'Failed',
    skipped: 'Skipped',
  },

  // AI reasoning templates
  reasoning: {
    highConfidence: 'Request is clear and specific, can execute immediately.',
    mediumConfidence: 'Request understood but requires some assumptions.',
    lowConfidence: 'Request is ambiguous or complex, user confirmation needed.',
    complexPlan: 'Plan is complex, safer to execute after approval.',
    destructiveAction: 'Includes critical changes, approval required.',
  },

  // Time units
  time: {
    seconds: 'seconds',
    minutes: 'minutes',
    hours: 'hours',
    days: 'days',
  },

  // Common actions
  actions: {
    retry: 'Retry',
    cancel: 'Cancel',
    confirm: 'Confirm',
    close: 'Close',
  },

  // Chat interface
  chat: {
    placeholder: 'Type a message...',
    loading: 'Loading chat history...',
    emptyState: 'Start a new conversation',
    sendError: 'Failed to send message',
    errorPrefix: 'Error',
  },
};
