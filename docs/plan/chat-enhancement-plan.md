# Chat Enhancement Plan

## 개요

현재 `handleMultiAgentChat` 함수의 한계를 극복하고, 사용자 경험을 크게 향상시키는 계획입니다.

## 문제점

### 현재 상황
- 모든 채팅 메시지를 프로젝트 생성 요청으로만 처리
- "버튼 색이 마음에 안들어" → 프로젝트 생성 (부적절!)
- 하드코딩된 응답들
- 컨텍스트 부족으로 인한 모호한 처리

### 핵심 이슈
`chat /= multiAgent` - 채팅과 멀티 에이전트가 적절히 통합되지 않음

## 해결 방향

### 1순위: 대화 컨텍스트 유지
- 사용자의 이전 대화 내용 기억
- 현재 작업 중인 프로젝트/컴포넌트 상태 파악

### 2순위: 메시지 의도 파악 및 적절한 분기 처리
- 사용자 요청을 정확히 이해
- 의도에 맞는 적절한 핸들러 선택

### 3순위: 프롬프트 개선
- 사용자 요청을 더 구체적이고 실행 가능한 형태로 변환
- AI 기반 의도 분석 (Rule-based 아님!)

## 기술적 설계

### 레이어 분리
```
┌─────────────────────────────────────────────────────────────┐
│                    Chat Interface Layer                     │
│  (사용자 입력/출력, 대화 흐름 관리)                          │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                  Intent Analysis Layer                      │
│  (메시지 의도 파악, 컨텍스트 분석)                          │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                 Action Routing Layer                        │
│  (의도별 처리 분기, 적절한 핸들러 선택)                     │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                Execution Layer                              │
│  (멀티 에이전트 실행, 비즈니스 로직 처리)                   │
└─────────────────────────────────────────────────────────────┘
```

### 핵심 설계 원칙
- **Single Responsibility**: 각 레이어는 하나의 책임만
- **Open/Closed**: 새로운 의도나 액션을 추가할 때 기존 코드 수정 없이 확장
- **Context-Aware**: 모든 처리에서 현재 컨텍스트를 고려

### 데이터 흐름
```
User Message → Context Enrichment → Intent Analysis →
Action Selection → Prompt Enhancement → Execution →
Response Generation → Context Update
```

## 구현 계획

### Phase 1: 즉시 구현 가능 (1-2주)
1. **PromptEnhancer 클래스 구현**
   - AI 기반 프롬프트 개선
   - 의도, 대상, 액션 명확화

2. **ContextManager 구현**
   - 세션 기반 컨텍스트 관리
   - 사용자별 대화 상태 유지

3. **ActionRouter 구현**
   - 의도별 처리 분기
   - 적절한 핸들러 선택

### Phase 2: 중기 구현 (1-2개월)
1. **컨텍스트 관리 강화**
   - 대화 히스토리 참조 해결
   - 상태 기반 컨텍스트

2. **Fallback 시스템 구현**
   - 예상치 못한 케이스 처리
   - Graceful degradation

### Phase 3: 장기 구현 (3-6개월)
1. **실시간 상태 동기화**
   - WebSocket 기반 실시간 업데이트
   - 협업 기능 지원

## 핵심 컴포넌트

### PromptEnhancer
```typescript
class PromptEnhancer {
  async enhance(message: string, context: Context): Promise<EnhancedPrompt> {
    // AI를 사용해 사용자 요청을 명확하게 변환
    // "버튼 색이 마음에 안들어" → "현재 프로젝트의 버튼 컴포넌트 색상 변경"
  }
}
```

### ContextManager
```typescript
class ContextManager {
  async getContext(sessionId: string, userId: string): Promise<UserSession> {
    // 사용자 세션 및 대화 컨텍스트 관리
  }
}
```

### ActionRouter
```typescript
class ActionRouter {
  route(intent: Intent): ActionHandler {
    // 의도에 따른 적절한 핸들러 선택
  }
}
```

## 예상 효과

### 사용자 경험 향상
- 자연스러운 대화형 인터페이스
- 컨텍스트 인식으로 인한 정확한 응답
- 예상치 못한 요청에 대한 우아한 처리

### 개발자 경험 향상
- 확장 가능한 아키텍처
- 명확한 책임 분리
- 테스트하기 쉬운 구조

### 시스템 안정성
- Fallback 시스템으로 인한 안정성
- 에러 상황에서도 사용자 친화적 응답
- 지속적인 개선 가능

## 다음 단계

1. **PromptEnhancer 클래스 구현 시작**
2. **ContextManager 인터페이스 설계**
3. **기존 handleMultiAgentChat 리팩토링 계획 수립**

## 참고 사항

- 기존 프로젝트 생성 기능은 반드시 유지
- 점진적 구현으로 기존 코드 영향 최소화
- 사용자 피드백을 통한 지속적 개선
