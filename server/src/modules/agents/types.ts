/*
 * Agent Types and Interfaces
 * 에이전트 시스템에서 사용하는 모든 타입 정의
 */

import { IntentAnalysis } from '@/core/types/intent';
import { UserContext } from '@/core/contextManager';

// -----------------------------
// Core Agent Interfaces
// -----------------------------
export interface Agent {
    name: string;
    description: string;
    canHandle(intent: string): boolean;
    execute(
        message: string,
        intentAnalysis: IntentAnalysis,
        userContext: UserContext,
        sessionId: string
    ): Promise<AgentResult>;
}

export interface AgentResult {
    success: boolean;
    message: string;
    data?: any;
    type: 'text' | 'project' | 'project_creation' | 'project_setup' | 'development_setup' | 'deployment_setup' | 'component' | 'page' | 'code' | 'site_plan' | 'site_composed';
    metadata?: {
        executionTime: number;
        tokens: number;
        model: string;
    };
}

// -----------------------------
// Agent Categories
// -----------------------------
export type AgentType =
    | 'project_creation'
    | 'project_setup'
    | 'development_setup'
    | 'deployment_setup'
    | 'site_planning'
    | 'site_composition'
    | 'component_modification'
    | 'page_modification'
    | 'code_review'
    | 'bug_fix'
    | 'feature_request'
    | 'general_conversation'
    | 'question_answer';

// -----------------------------
// Agent Registration
// -----------------------------
export interface AgentRegistry {
    [key: string]: Agent;
}

// -----------------------------
// Execution Context
// -----------------------------
export interface ExecutionContext {
    message: string;
    intentAnalysis: IntentAnalysis;
    userContext: UserContext;
    sessionId: string;
    model: any;
}
