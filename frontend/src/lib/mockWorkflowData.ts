/**
 * @file Mock workflow response data for development
 * Used until backend Step 4 is complete
 */

import type {
  WorkflowResponse,
  ExecutionStartedResponse,
  ProposalRequiredResponse,
  ErrorResponse,
} from '@/types/workflow';

/**
 * Mock: Execution started immediately
 */
export const mockExecutionStarted: ExecutionStartedResponse = {
  type: 'EXECUTION_STARTED',
  runId: 'run_mock_12345',
  sseUrl: '/api/sse/projects/proj_123?ticket=mock_ticket',
  planSummary: {
    name: 'Create Landing Page',
    description: 'Build a modern landing page with hero section and features',
    steps: [
      {
        id: 'step_1',
        title: 'Create page structure',
        description: 'Set up the basic Next.js page structure',
        tool: 'create_vfs_file',
      },
      {
        id: 'step_2',
        title: 'Add hero section',
        description: 'Implement hero section with Tailwind CSS',
        tool: 'create_vfs_file',
      },
      {
        id: 'step_3',
        title: 'Add features section',
        description: 'Create features section with grid layout',
        tool: 'create_vfs_file',
      },
    ],
    estimatedDuration: 180000, // 3 minutes
  },
};

/**
 * Mock: High confidence proposal
 */
export const mockProposalHighConfidence: ProposalRequiredResponse = {
  type: 'PROPOSAL_REQUIRED',
  proposalId: 'prop_mock_high_001',
  reasoning: 'This request involves creating multiple new files. I want to confirm the structure before proceeding.',
  confidence: 0.98,
  planSummary: {
    name: 'Add Authentication System',
    description: 'Implement NextAuth.js with Google OAuth',
    steps: [
      {
        id: 'step_1',
        title: 'Install dependencies',
        description: 'Add next-auth and required packages',
        tool: 'run_shell_command',
      },
      {
        id: 'step_2',
        title: 'Create auth configuration',
        description: 'Set up NextAuth config with Google provider',
        tool: 'create_vfs_file',
      },
      {
        id: 'step_3',
        title: 'Add API route',
        description: 'Create /api/auth/[...nextauth] route',
        tool: 'create_vfs_file',
      },
      {
        id: 'step_4',
        title: 'Create login page',
        description: 'Build sign-in page UI',
        tool: 'create_vfs_file',
      },
    ],
    estimatedDuration: 300000, // 5 minutes
  },
};

/**
 * Mock: Medium confidence proposal
 */
export const mockProposalMediumConfidence: ProposalRequiredResponse = {
  type: 'PROPOSAL_REQUIRED',
  proposalId: 'prop_mock_med_002',
  reasoning: 'Your request is somewhat ambiguous. Please review the plan to ensure it matches your intent.',
  confidence: 0.82,
  planSummary: {
    name: 'Update Styling',
    description: 'Modify component styles based on user request',
    steps: [
      {
        id: 'step_1',
        title: 'Update button styles',
        description: 'Change button colors and hover states',
        tool: 'update_vfs_file',
      },
      {
        id: 'step_2',
        title: 'Update card styles',
        description: 'Adjust card padding and borders',
        tool: 'update_vfs_file',
      },
    ],
    estimatedDuration: 120000, // 2 minutes
  },
};

/**
 * Mock: Low confidence proposal
 */
export const mockProposalLowConfidence: ProposalRequiredResponse = {
  type: 'PROPOSAL_REQUIRED',
  proposalId: 'prop_mock_low_003',
  reasoning: 'Your request is unclear, and I am not confident about the best approach. Please carefully review this plan or provide more details.',
  confidence: 0.65,
  planSummary: {
    name: 'Implement Feature',
    description: 'Add requested functionality',
    steps: [
      {
        id: 'step_1',
        title: 'Create component',
        description: 'Build the required component',
        tool: 'create_vfs_file',
      },
      {
        id: 'step_2',
        title: 'Add logic',
        description: 'Implement business logic',
        tool: 'update_vfs_file',
      },
    ],
    estimatedDuration: 240000, // 4 minutes
  },
};

/**
 * Mock: Error response
 */
export const mockError: ErrorResponse = {
  type: 'ERROR',
  errorCode: 'VALIDATION_FAILED',
  message: 'Failed to generate a valid plan from your request. Please try rephrasing.',
  retryable: true,
};

/**
 * Mock: Proposal expired error
 */
export const mockProposalExpiredError: ErrorResponse = {
  type: 'ERROR',
  errorCode: 'PROPOSAL_EXPIRED',
  message: 'This proposal has expired. Please submit a new request.',
  retryable: false,
};

/**
 * Get a random mock response for testing
 */
export function getRandomMockResponse(): WorkflowResponse {
  const responses: WorkflowResponse[] = [
    mockExecutionStarted,
    mockProposalHighConfidence,
    mockProposalMediumConfidence,
    mockProposalLowConfidence,
    mockError,
  ];

  return responses[Math.floor(Math.random() * responses.length)];
}

/**
 * Simulate API delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Mock API call
 */
export async function mockSendMessage(message: string): Promise<WorkflowResponse> {
  await delay(1000 + Math.random() * 1000); // 1-2 seconds

  // Simple heuristics for demo
  if (message.toLowerCase().includes('delete') || message.toLowerCase().includes('remove')) {
    return mockProposalMediumConfidence;
  }

  if (message.toLowerCase().includes('error') || message.toLowerCase().includes('fail')) {
    return mockError;
  }

  if (message.split(' ').length < 5) {
    return mockProposalLowConfidence;
  }

  if (Math.random() > 0.7) {
    return mockProposalHighConfidence;
  }

  return mockExecutionStarted;
}
