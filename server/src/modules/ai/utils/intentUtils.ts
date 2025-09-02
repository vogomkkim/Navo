export function analyzeIntent(text: string) {
  // 기본적인 의도 분석 로직
  const intents = {
    'project_creation': /(프로젝트|프로젝트 생성|새 프로젝트|만들기)/i,
    'code_generation': /(코드|코드 생성|개발|구현)/i,
    'error_fix': /(에러|오류|버그|수정|해결)/i,
    'question': /(\?|질문|궁금|알려주세요)/i,
    'general': /(안녕|hello|hi)/i
  };

  for (const [intent, pattern] of Object.entries(intents)) {
    if (pattern.test(text)) {
      return {
        intent,
        confidence: 0.8,
        entities: []
      };
    }
  }

  return {
    intent: 'general',
    confidence: 0.5,
    entities: []
  };
}

export function extractEntities(text: string) {
  const entities = [];

  // 프로젝트 이름 추출
  const projectMatch = text.match(/(프로젝트|project)\s*이름[은는]?\s*["']?([^"']+)["']?/i);
  if (projectMatch) {
    entities.push({
      type: 'project_name',
      value: projectMatch[2]
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
    enhanced_message: parsed.enhanced_message || ''
  };
}

export function decideExecution(normalized: any) {
  return {
    status: normalized.blocking_reasons?.length > 0 ? 'manual' : 'auto',
    reason: normalized.blocking_reasons?.length > 0 ? 'missing_info' : 'ready',
    missing: normalized.required_fields || []
  };
}

export function buildSystemInstruction() {
  return `당신은 사용자의 의도를 분석하는 AI 어시스턴트입니다.
다음 JSON 형식으로 응답하세요:
{
  "type": "project_creation|code_generation|error_fix|question|general",
  "confidence": 0.0-1.0,
  "description": "의도 설명",
  "is_vague": true/false,
  "targets": ["대상"],
  "actions": ["수행할 작업"],
  "required_fields": ["필요한 정보"],
  "blocking_reasons": ["차단 이유"],
  "routing_key": "라우팅 키",
  "enhanced_message": "향상된 메시지"
}`;
}

export function buildUserPrompt(message: string, contextInfo: any) {
  return `사용자 메시지: ${message}
컨텍스트: ${JSON.stringify(contextInfo)}
위 메시지의 의도를 분석해주세요.`;
}
