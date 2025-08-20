# Navo Roadmap

## 1. Overall Roadmap

**Phase 0 — Foundation** _(✅ 완료)_

- 리포지토리 초기화 (`README`, `docs/`, `navo/` 구조)
- 기본 위생 파일 (`CONTRIBUTING`, `CODE_OF_CONDUCT`, `LICENSE` 등)

**Phase 1 — MVP (4주)**

- **W1**: DB 스키마 초안, Draft API(Mock), 에디터 프레임(Canavs/Panel/Save), 이벤트 수집기 스켈레톤 ✅
  - Define schemas for core objects
  - Draft API (mock)
  - Editor frame: canvas, panel, save plumbing
  - Events collector skeleton
  - Demo: show draft preview stub in ~10 s
- **W2**: 텍스트/이미지/스타일 편집, Chat→Diff(3~5 규칙), 에셋 업로드 & 갤러리 ✅
  - Text/image/style edits
  - Chat → diff with 3–5 safe rules
  - Asset upload and gallery
  - Demo: edit flow with visible diffs and autosave stub
- **W3**: AI Intent Parser, 프로젝트 구조 생성, Hot-reload 개발 환경 ✅
  - **AI Intent Parser**: 사용자 요청을 분석하여 완전한 프로젝트 구조 생성
  - 데이터베이스 스키마, 페이지 구조, 컴포넌트, API 엔드포인트 자동 설계
  - Hot-reload 개발 환경으로 개발 효율성 대폭 향상
  - Demo: "인스타그램같은 사이트" → 완전한 프로젝트 구조 생성
- **W4**: 배포 파이프라인(서브도메인·SSL·CDN), 기본 분석(뷰/클릭), AI 제안 v1, 안정화
  - Publish pipeline (mock → real)
  - Analytics (view/click)
  - Suggestion type 1 (style or copy)
  - Stabilization and polish
  - Demo: one‑click publish to subdomain and basic metrics

**Phase 2 — Private Beta (4~6주)**

- A/B 테스트, 제안 v2, 템플릿 라이브러리
- 인증·결제, 공유/QR 생성

**Phase 3 — Public Launch**

- 가격 정책, 온보딩 개선, 상태·모니터링, 지원 문서, 데모 갤러리

**Phase 4 — Scale & Marketplace**

- 플러그인/위젯 마켓, 멀티 프로젝트/조직, 온프레미스·엔터프라이즈 지원

---

## 2. Technical Roadmap

**Layer 구조**

1. **Client Layer**
   - 비주얼 에디터(Canvas/Panel/Chat)
   - 미리보기, 배포 UI
2. **Orchestrator Layer**
   - DI + Node Graph 실행 엔진
   - 독립 작업 병렬 처리, 의존 순서 준수
   - Context 취소·타임아웃 지원
3. **Services Layer**
   - LLM/카피, 이미지 생성, 레이아웃 JSON 관리
   - 빌드·배포, 에셋 저장, 분석 서비스
4. **Data Layer**
   - Postgres, 오브젝트 스토리지(S3 호환)
   - 이벤트 수집·집계, 제안 저장

**주요 기술 마일스톤**

- **S1**: Draft API (Mock → 실 서비스 연결) ✅
- **S2**: 에디터 핵심 기능 (텍스트/이미지/스타일) ✅
- **S3**: Chat→Diff 엔진 ✅
- **S4**: **AI Intent Parser** ✅ - 사용자 요청을 분석하여 완전한 프로젝트 구조 생성
- **S5**: 배포 파이프라인 (서브도메인·SSL·CDN) 🔄
- **S6**: 분석 수집기 (뷰/클릭) + AI 제안 v1 🔄
- **S7**: Undo/Autosave/롤백 📋

현재 진행 중인 작업은 [Current Focus](current-focus.md) 문서를 참조하세요.
