export interface UserRequest {
  userMessage: string;
  // Add other relevant context from the user request if needed
  // e.g., userId?: string; projectId?: string; sessionId?: string;
}

export interface OrchestrationResult {
  ok: boolean;
  message: string;
  data?: any;
  error?: string;
}

export interface AgentContext {
  app: any; // FastifyInstance, or a more specific type if available
  userId?: string;
  projectId?: string;
  sessionId?: string;
  // Add other context that agents might need
}

export interface AgentResponse {
  status: 'success' | 'failure' | 'pending';
  output?: any;
  error?: string;
  nextAction?: string; // For dynamic planning
}

import { FastifyInstance } from 'fastify';

// Represents a user's request to the orchestrator
export interface UserRequest {
  userMessage: string;
  // Future additions: userId, sessionId, etc.
}

// Represents the final result of the orchestration
export interface OrchestrationResult {
  ok: boolean;
  message: string;
  data?: any;
  error?: string;
}

// Context passed to each agent/tool during execution
export interface AgentContext {
  app: FastifyInstance;
  // Future additions: db connection, user info, etc.
}

// Standardized response format for any executable unit (Agent or Tool)
export interface AgentResponse {
  status: 'success' | 'error';
  output?: any;
  error?: string;
}

// Interface for self-contained AI agents
export interface Agent {
  name: string;
  execute(context: AgentContext, input: any): Promise<AgentResponse>;
}

// --- New Additions for Phase 2 ---

// Interface for tools that perform specific, non-AI tasks (e.g., file system, shell)
export interface Tool {
  name: string;
  description: string;
  execute(context: AgentContext, input: any): Promise<AgentResponse>;
}

// A union type to represent anything that the orchestrator can execute
export type Executable = Agent | Tool;

// Represents the output of the Intent Analyzer
export interface Intent {
  executableName: string; // The name of the Agent or Tool to run
  input: any; // The input data for the executable
}

