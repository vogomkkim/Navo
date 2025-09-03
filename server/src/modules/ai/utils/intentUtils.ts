export function analyzeIntent(text: string) {
  // 기본적인 의도 분석 로직
  const intents = {
    project_creation: /(프로젝트|프로젝트 생성|새 프로젝트|만들기)/i,
    code_generation: /(코드|코드 생성|개발|구현)/i,
    error_fix: /(에러|오류|버그|수정|해결)/i,
    question: /(\?|질문|궁금|알려주세요)/i,
    general: /(안녕|hello|hi)/i,
  };

  for (const [intent, pattern] of Object.entries(intents)) {
    if (pattern.test(text)) {
      return {
        intent,
        confidence: 0.8,
        entities: [],
      };
    }
  }

  return {
    intent: 'general',
    confidence: 0.5,
    entities: [],
  };
}

export function extractEntities(text: string) {
  const entities = [];

  // 프로젝트 이름 추출
  const projectMatch = text.match(
    /(프로젝트|project)\s*이름[은는]?\s*["']?([^"']+)["']?/i
  );
  if (projectMatch) {
    entities.push({
      type: 'project_name',
      value: projectMatch[2],
    });
  }

  return entities;
}

export function normalizeModelAnalysis(parsed: any) {
  return {
    type: parsed.type || 'general',
    confidence: parsed.confidence || 0.5,
    description: parsed.description || '',
    is_vague: parsed.is_vague || false,
    targets: parsed.targets || [],
    actions: parsed.actions || [],
    required_fields: parsed.required_fields || [],
    blocking_reasons: parsed.blocking_reasons || [],
    routing_key: parsed.routing_key || 'default',
    enhanced_message: parsed.enhanced_message || '',
  };
}

export function decideExecution(normalized: any) {
  return {
    status: normalized.blocking_reasons?.length > 0 ? 'manual' : 'auto',
    reason: normalized.blocking_reasons?.length > 0 ? 'missing_info' : 'ready',
    missing: normalized.required_fields || [],
  };
}

export function buildSystemInstruction() {
  const routingKeys = [
    'GreetingAgent',      // For general greetings and simple conversation
    'FileSystemTool',     // For listing files or other file operations
    'ProjectCreationAgent', // For creating new projects
    'CodeGenerationAgent',  // For generating code snippets
    'ErrorFixAgent',        // For fixing errors
    'GeneralQuestionAgent'  // For answering general questions
  ];

  return `You are an AI assistant that analyzes user intent.
Respond in the following JSON format ONLY. Do not add any commentary.

{
  "type": "A string categorizing the intent (e.g., 'general_greeting', 'file_operation').",
  "confidence": "A float between 0.0 and 1.0 representing your confidence.",
  "description": "A brief description of the user's intent.",
  "is_vague": "A boolean indicating if the request is ambiguous.",
  "routing_key": "ONE of the following exact string values: ${routingKeys.join(' | ')}. Choose the most appropriate key.",
  "actions": [
    {
      "type": "The specific action to perform. This MUST be a valid operation for the chosen routing_key.",
      "parameters": {
        "key": "value"
      }
    }
  ],
  "enhanced_message": "An improved version of the user's message."
}

### Routing Key and Action Rules:
- If the user wants to list files, set routing_key to "FileSystemTool" and actions to [{"type": "execute", "parameters": {"operation": "listFiles", "path": "."}}].
- If the user provides a greeting, set routing_key to "GreetingAgent" and actions to [{"type": "greet", "parameters": {"message": "User greeting"}}].
- For all other cases, analyze and determine the most appropriate routing_key and actions.
`;
}

export function buildUserPrompt(message: string, contextInfo: any) {
  return `사용자 메시지: ${message}
컨텍스트: ${JSON.stringify(contextInfo)}
위 메시지의 의도를 분석해주세요.`;
}
