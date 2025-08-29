# Current Focus & Next Steps

## 🎯 **현재 작업 완료 상태**

### ✅ **완료된 작업들** (2025-01-27)
- [x] `aiHandlers.ts` 하드코딩 제거
- [x] `generateAndStoreDummySuggestion` 관련 함수들 제거
- [x] `handleSeedDummyData` 함수 제거
- [x] suggestions 관련 미완성 함수들 제거
- [x] Chat Enhancement Plan 문서화

### 🔄 **진행 중인 작업**
- **Chat Enhancement System 설계 및 계획 수립** ✅ 완료

### 📋 **다음에 이어서 할 작업** (우선순위 순)

#### **Phase 1: 즉시 구현 가능 (1-2주)**

1. **PromptEnhancer 클래스 구현** 🚀 **NEXT**
   - 위치: `navo/handlers/aiHandlers.ts` 수정
   - 목표: AI 기반 프롬프트 개선으로 사용자 요청 명확화
   - 예시: "버튼 색이 마음에 안들어" → "현재 프로젝트의 버튼 컴포넌트 색상 변경"

2. **ContextManager 클래스 구현**
   - 위치: `navo/handlers/` 또는 `navo/core/`에 새 파일
   - 목표: 사용자 세션 및 대화 컨텍스트 관리

3. **ActionRouter 클래스 구현**
   - 위치: `navo/handlers/` 또는 `navo/core/`에 새 파일
   - 목표: 의도별 처리 분기 및 적절한 핸들러 선택

#### **Phase 2: 중기 구현 (1-2개월)**
- Fallback 시스템 구현
- 컨텍스트 관리 강화

#### **Phase 3: 장기 구현 (3-6개월)**
- 실시간 상태 동기화
- 협업 기능 지원

## 📚 **참조 문서**

- **계획 문서**: `docs/plan/chat-enhancement-plan.md`
- **현재 코드**: `navo/handlers/aiHandlers.ts`
- **기존 에이전트**: `navo/agents/masterDeveloperAgent.ts`

## 🚀 **즉시 시작할 작업**

### **PromptEnhancer 구현 시작**
```typescript
// navo/handlers/aiHandlers.ts에 추가할 클래스
class PromptEnhancer {
  constructor(private ai: GoogleGenerativeAI) {}

  async enhance(message: string, context: Context): Promise<EnhancedPrompt> {
    // AI를 사용해 사용자 요청을 명확하게 변환
    // "버튼 색이 마음에 안들어" → "현재 프로젝트의 버튼 컴포넌트 색상 변경"
  }
}
```

## 💡 **작업 시작 방법**

1. **이 파일 확인**: `docs/progress/current-focus.md`
2. **계획 문서 참조**: `docs/plan/chat-enhancement-plan.md`
3. **코드 수정 시작**: `navo/handlers/aiHandlers.ts`

## 📝 **작업 완료 후 업데이트**

각 작업 완료 시 이 파일을 업데이트하여 진행 상황을 추적하세요.
