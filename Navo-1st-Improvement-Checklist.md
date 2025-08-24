# 🛠️ Navo 1차 개선 체크리스트

## 🔴 최우선 (보안·기능 오류 방지)
- [ ] `handleDraft` → `where` 조건 통합 (`and(eq(...), eq(...))` 사용)
- [ ] 하드코딩된 값 제거  
  - [ ] `JWT_SECRET = 'your-secret-key'` 제거 → 환경변수 필수화  
  - [ ] 더미 유저 ID (`0000...`) → 미들웨어에서 `userId` 주입
- [ ] HTML 렌더링 시 `innerHTML` → XSS 방어 처리 필요  

---

## 🟠 중요 (구조 정리, 중복 제거)
- [ ] `renderComponent`의 `switch-case` → 컴포넌트 타입 ↔ 템플릿 매핑 방식으로 변경
- [ ] `handleEvents / handleAnalyticsEvents / handleLogError` → 공통 유틸 함수로 통합
- [ ] `handleSeedComponentDefinitions` → 하드코딩 데이터 JSON 분리 & 배치 업서트
- [ ] API 라우트 → Express `Router` 기반으로 기능별 분리 (`projects`, `auth`, `components`, …)
- [ ] 프론트엔드 `app.js` (1400줄) → 기능별 모듈/컴포넌트로 나누기  

---

## 🟡 중간 (확장성·가독성 개선)
- [ ] 공통 `config.ts` 도입 (API URL, Feature Flag, Secrets 관리)
- [ ] 프론트엔드 JS → TS/TSX 전환 (타입 일관성 확보)
- [ ] DB 쿼리 API (`db.query.*` vs `db.select()`) → 일관성 유지
- [ ] 자주 조회하는 필드 인덱스 점검 (예: `projects.owner_id`)
- [ ] `console.log` → Logger(Winston 등)로 교체  

---

## 🟢 다음 단계 (장기 개선)
- [ ] React 컴포넌트 기반 구조로 전환 (웹/모바일 공유 가능)
- [ ] API 서비스/유틸 함수 계층 분리 (fetch, 포맷팅 로직)
- [ ] Express 에러 핸들링 미들웨어 추가 (중복 try/catch 제거)
- [ ] 자동화된 테스트 도입 (단위/통합 테스트)
- [ ] CI에 Lint & Format 검증 추가