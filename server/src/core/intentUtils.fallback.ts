import { UserContext } from '@/core/contextManager';

// --- Preconditions Map ---
const preconditionsMap: { [actionType: string]: string[] } = {
  'project.create': ['noActiveProjectId'],
  'project.add_pages': ['activeProjectId'],
  'vfs.create_dir': ['activeProjectId', 'writableWorkspace'],
  'vfs.create_file': ['activeProjectId', 'writableWorkspace'],
};

// --- Precondition Checkers ---
const checkPreconditions = (actionType: string, userContext: UserContext): { met: boolean; reason?: string } => {
  const conditions = preconditionsMap[actionType];
  if (!conditions) {
    return { met: true }; // No preconditions for this action
  }

  for (const condition of conditions) {
    switch (condition) {
      case 'noActiveProjectId':
        if (userContext.currentProject) {
          return { met: false, reason: `Action '${actionType}' requires no active project, but '${userContext.currentProject.name}' is active.` };
        }
        break;
      case 'activeProjectId':
        if (!userContext.currentProject) {
          return { met: false, reason: `Action '${actionType}' requires an active project, but none is selected.` };
        }
        break;
      case 'writableWorkspace':
        // Placeholder for future implementation (e.g., check file permissions)
        break;
      default:
        // Unknown condition, fail safe
        return { met: false, reason: `Unknown precondition '${condition}' for action '${actionType}'.` };
    }
  }

  return { met: true };
};


export function buildSystemInstruction(domain: 'project_management' | 'general_conversation'): string {
  if (domain === 'project_management') {
    return `You are a world-class AI software engineer. Your goal is to understand the user's request and break it down into actionable steps.
Analyze the user's message in the context of the current project and conversation.
Respond in JSON format with the following fields:
- "type": The overall intent type (e.g., "file_management", "code_generation", "refactoring").
- "confidence": Your confidence in this analysis (0.0 to 1.0).
- "description": A brief summary of your understanding.
- "is_vague": boolean, true if the request is ambiguous or lacks detail.
- "actions": An array of specific actions to be taken (e.g., { "type": "vfs.create_file", "parameters": { "path": "...", "content": "..." } }).
- "targets": An array of entities the user is referring to.`;
  }
  
  // general_conversation
  return `You are a helpful assistant. Your goal is to answer the user's general questions.
If you can answer directly, do so. If you need to search the web, use the available tools.
Respond in JSON format with the following fields:
- "type": "general_knowledge" or "chitchat".
- "confidence": Your confidence in this analysis (0.0 to 1.0).
- "description": A brief summary of the user's question.
- "actions": An array of actions, likely { "type": "answer.general", "parameters": { "answer_text": "..." } } or { "type": "tool.google_search", "parameters": { "query": "..." } }.`;
}

export function buildUserPrompt(message: string, _context: any): string {
  // For now, context is baked into the system prompt of the calling service.
  // This can be expanded to include specific file contents, etc.
  return message;
}

export function normalizeModelAnalysis(parsed: any): any {
  return {
    type: parsed?.type ?? 'general',
    confidence: parsed?.confidence ?? 0.5,
    description: parsed?.description ?? 'N/A',
    is_vague: parsed?.is_vague ?? false,
    targets: parsed?.targets ?? [],
    actions: parsed?.actions ?? [],
    required_fields: parsed?.required_fields ?? [],
    blocking_reasons: parsed?.blocking_reasons ?? [],
    routing_key: parsed?.routing_key ?? 'default',
    enhanced_message: parsed?.enhanced_message ?? undefined,
  };
}

export function decideExecution(normalized: any, userContext: UserContext): any {
  // --- Generalized Precondition Check ---
  if (normalized.actions && normalized.actions.length > 0) {
    for (const action of normalized.actions) {
      const { met, reason } = checkPreconditions(action.type, userContext);
      if (!met) {
        return {
          status: 'blocked',
          reason: reason || 'Precondition not met.',
          missing: [],
        };
      }
    }
  }

  // Default execution logic
  if (normalized.confidence < 0.7 || normalized.is_vague) {
    return {
      status: 'manual',
      reason: 'Low confidence or vague request.',
      missing: normalized.required_fields || [],
    };
  }

  return {
    status: 'auto',
    reason: 'High confidence and clear request.',
    missing: [],
  };
}
