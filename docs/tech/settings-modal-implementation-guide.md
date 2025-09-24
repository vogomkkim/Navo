# Settings Modal 구현 가이드

**날짜:** 2025년 9월 24일
**상태:** 구현 가이드
**목적:** Vercel OAuth 연동을 위한 Settings Modal 아키텍처 설계

---

## 1. 전체 아키텍처 개요

### 핵심 원칙

- **EP-002의 관심사 분리**: 각 설정 영역이 독립적으로 관리
- **EP-004의 최선의 길**: 쉬운 방법이 아니라 최선의 방법을 선택
- **EP-005의 확장성**: 향후 다른 서비스 연동을 위한 구조적 기반
- **EP-006의 사용자 경험**: 모달을 통한 부드러운 설정 변경

### 컴포넌트 구조

```
SettingsModal (메인 모달 컨테이너)
├── SettingsHeader (제목 및 닫기 버튼)
├── SettingsTabs (탭 네비게이션)
└── SettingsContent (탭별 콘텐츠)
    ├── AccountSettings (계정 설정)
    │   └── 기타 계정 설정들
    ├── ProjectSettings (프로젝트 설정)
    └── IntegrationsSettings (연동 서비스 관리)
        ├── IntegrationCard (연동 서비스 카드)
        │   ├── VercelCard (Vercel 연동)
        │   ├── GitHubCard (GitHub 연동 - 향후)
        │   └── AWSCard (AWS 연동 - 향후)
        └── IntegrationStatus (전체 연동 상태)
```

### 파일 구조

```
frontend/src/
├── components/
│   ├── settings/
│   │   ├── SettingsModal.tsx (메인 모달)
│   │   ├── SettingsTabs.tsx (탭 네비게이션)
│   │   ├── AccountSettings.tsx (계정 설정)
│   │   └── ProjectSettings.tsx (프로젝트 설정)
│   └── ui/ (기존 UI 컴포넌트들)
│       ├── Button.tsx
│       └── Panel.tsx
└── integrations/
    ├── IntegrationsSettings.tsx (연동 관리)
    ├── IntegrationCard.tsx (재사용 가능한 카드)
    ├── VercelCard.tsx (Vercel 전용)
    ├── GitHubCard.tsx (GitHub 전용 - 향후)
    └── AWSCard.tsx (AWS 전용 - 향후)
```

---

## 2. 파일 구조 및 역할

### 2.1 메인 모달 컴포넌트

**파일:** `frontend/src/components/settings/SettingsModal.tsx`

**역할:**

- 모달 오버레이 및 기본 레이아웃 관리
- 탭 상태 관리 (useState)
- 모달 열기/닫기 로직
- 키보드 접근성 (ESC 키로 닫기)

**주요 Props:**

```typescript
interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "account" | "project" | "integrations";
}
```

### 2.2 탭 네비게이션

**파일:** `frontend/src/components/settings/SettingsTabs.tsx`

**역할:**

- 탭 버튼 렌더링
- 활성 탭 표시
- 탭 변경 핸들링

**탭 구성:**

- **Account**: 계정 관련 설정
- **Project**: 프로젝트 관련 설정 (현재 선택된 프로젝트 기준)
- **Integrations**: 외부 서비스 연동 (향후 확장)

### 2.3 계정 설정 컴포넌트

**파일:** `frontend/src/components/settings/AccountSettings.tsx` (기존 파일 리팩토링)

**역할:**

- 사용자 계정 정보 표시
- 기본 계정 설정 관리

### 2.4 프로젝트 설정 컴포넌트

**파일:** `frontend/src/components/settings/ProjectSettings.tsx` (기존 파일 리팩토링)

**역할:**

- 프로젝트 관련 설정 관리
- 프로젝트 이름 변경 등

### 2.5 연동 서비스 관리 컴포넌트

**파일:** `frontend/src/integrations/IntegrationsSettings.tsx` (신규 생성)

**역할:**

- 모든 연동 서비스 통합 관리
- 연동 서비스 카드 렌더링
- 전체 연동 상태 표시

### 2.6 연동 서비스 카드 컴포넌트

**파일:** `frontend/src/integrations/IntegrationCard.tsx` (신규 생성)

**역할:**

- 재사용 가능한 연동 서비스 카드
- 연동 상태 표시
- 연동/해제 버튼

**주요 Props:**

```typescript
interface IntegrationCardProps {
  service: {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    isConnected: boolean;
    connectedAt?: string;
  };
  onConnect: () => void;
  onDisconnect: () => void;
}
```

### 2.7 Vercel 연동 카드

**파일:** `frontend/src/integrations/VercelCard.tsx` (신규 생성)

**역할:**

- Vercel 전용 연동 카드
- Vercel API 연동 로직
- 연동 상태 관리

---

## 3. 상태 관리 전략

### 3.1 로컬 상태 (useState)

```typescript
// SettingsModal.tsx
const [activeTab, setActiveTab] = useState<
  "account" | "project" | "integrations"
>("account");
const [isLoading, setIsLoading] = useState(false);
```

### 3.2 서버 상태 (react-query)

```typescript
// Vercel 연동 상태 확인
const {
  data: vercelStatus,
  isLoading,
  refetch,
} = useQuery({
  queryKey: ["vercel-integration"],
  queryFn: () => fetchApi("/api/vercel/status", { token }),
  enabled: !!token,
});
```

### 3.3 전역 상태 (필요시)

- 현재 선택된 프로젝트 ID (이미 useIdeStore에 존재)

---

## 4. API 엔드포인트 설계

### 4.1 Vercel 연동 상태 확인

**엔드포인트:** `GET /api/vercel/status`
**목적:** 현재 사용자의 Vercel 연동 상태 확인
**응답:**

```typescript
interface VercelStatusResponse {
  isConnected: boolean;
  connectedAt?: string;
  teamId?: string;
  teamName?: string;
}
```

### 4.2 Vercel 연동 해제

**엔드포인트:** `DELETE /api/vercel/disconnect`
**목적:** Vercel 연동 해제
**응답:**

```typescript
interface DisconnectResponse {
  success: boolean;
  message: string;
}
```

---

## 5. UI/UX 가이드라인

### 5.1 모달 디자인

- **오버레이**: 반투명 검은색 배경
- **크기**: 데스크톱에서 최대 800px 너비
- **위치**: 화면 중앙에 위치
- **애니메이션**: 부드러운 페이드 인/아웃

### 5.2 탭 디자인

- **활성 탭**: 하단 보더로 강조
- **비활성 탭**: 회색 텍스트
- **호버 효과**: 마우스 오버 시 배경색 변경

### 5.3 연동 상태 표시

- **연동됨**: 초록색 체크마크 + "Connected" 텍스트
- **연동 안됨**: 회색 아이콘 + "Not Connected" 텍스트
- **로딩 중**: 스피너 + "Checking..." 텍스트

---

## 6. 구현 순서

### Phase 1: 기본 모달 구조

1. `SettingsModal.tsx` 생성
2. `SettingsTabs.tsx` 생성
3. 기본 탭 전환 기능 구현

### Phase 2: 계정 설정 통합

1. 기존 `AccountSettings.tsx` 리팩토링
2. 모달 내부에서 사용하도록 수정
3. 스타일링 조정

### Phase 3: 연동 서비스 구조

1. `src/integrations/` 디렉토리 생성
2. `IntegrationsSettings.tsx` 생성
3. `IntegrationCard.tsx` 생성 (재사용 가능한 카드)
4. `VercelCard.tsx` 생성 (Vercel 전용 로직)
5. 연동 상태 확인 API 구현

### Phase 4: 프로젝트 설정 통합

1. 기존 `ProjectSettings.tsx` 모달 내부로 이동
2. 탭 구조에 통합

---

## 7. 기술적 고려사항

### 7.1 접근성 (Accessibility)

- ARIA 레이블 추가
- 키보드 네비게이션 지원
- 스크린 리더 호환성

### 7.2 반응형 디자인

- 모바일에서 전체 화면 모달
- 태블릿에서 적절한 크기 조정

### 7.3 에러 처리

- 네트워크 오류 시 사용자 친화적 메시지
- 연동 실패 시 재시도 옵션 제공

---

## 8. 향후 확장 계획

### 8.1 추가 연동 서비스

- GitHub 연동 (코드 저장소)
- AWS 연동 (클라우드 인프라)
- Stripe 연동 (결제 처리)

### 8.2 고급 설정

- 테마 설정
- 알림 설정
- 데이터 백업/복원

---

## 9. 참고사항

### 9.1 기존 코드 활용

- `AccountSettings.tsx`의 Vercel 연동 버튼 로직 재사용
- `ProjectSettings.tsx`의 폼 처리 로직 재사용

### 9.2 일관성 유지

- 기존 프로젝트의 스타일링 패턴 준수
- 기존 API 클라이언트 패턴 활용

### 9.3 테스트 고려사항

- 모달 열기/닫기 테스트
- 탭 전환 테스트
- Vercel 연동 플로우 테스트

---

## 10. 구현 체크리스트

- [ ] SettingsModal.tsx 생성
- [ ] SettingsTabs.tsx 생성
- [ ] AccountSettings.tsx 리팩토링
- [ ] src/integrations/ 디렉토리 생성
- [ ] IntegrationsSettings.tsx 생성
- [ ] IntegrationCard.tsx 생성 (재사용 가능)
- [ ] VercelCard.tsx 생성
- [ ] Vercel 상태 확인 API 구현
- [ ] 모달 스타일링 완료
- [ ] 접근성 기능 추가
- [ ] 반응형 디자인 적용
- [ ] 에러 처리 구현
- [ ] 테스트 작성

---

**이 가이드는 EP-006의 교훈에 따라 "살아있는 항해일지"로 작성되었습니다. 구현 과정에서 발견되는 새로운 요구사항이나 개선점은 이 문서에 지속적으로 반영되어야 합니다.**
