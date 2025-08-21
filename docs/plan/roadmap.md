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
- **W4**: 배포 파이프라인(서브도메인·SSL·CDN), 기본 분석(뷰/클릭), AI 제안 v1, 안정화 ✅
  - Publish pipeline (mock → real)
  - Analytics (view/click)
  - Suggestion type 1 (style or copy)
  - Stabilization and polish
  - Demo: one‑click publish to subdomain and basic metrics
- **W4+**: 컴포넌트 시스템 아키텍처 개선 🔄
  - **1단계**: 컴포넌트 렌더링 로직 분리 ✅ - 플랫폼과 사용자 컴포넌트 로직 명확히 분리
  - **2단계**: 동적 컴포넌트 로딩 시스템 ✅ - DB 기반 컴포넌트 정의, 템플릿 렌더링 시스템
  - **3-1단계**: 자연어 컴포넌트 생성 UI ✅ - 일반 사용자용 자연어 입력 인터페이스
  - **3-2단계**: AI 백엔드 구현 🔄 - 자연어 → HTML/CSS 변환 시스템

**Phase 2 — Private Beta (4~6주)**

**목표**: 내부 MVP를 넘어 소규모 비공개 베타 사용자를 위한 기능적이고 테스트 가능한 제품으로 전환. 핵심 사용자 여정 완료 및 초기 수익화/공유 기능에 집중.

**주요 결과물 및 집중 영역:**

1.  **코드 생성 및 라이브 미리보기 (핵심 갭 해소)**
    *   **목표**: AI가 생성한 설계도를 실제 동작하는 애플리케이션으로 변환하고, 사용자에게 라이브 미리보기 URL 제공.
    *   **세부 계획**:
        *   **W5**: **프로젝트 스캐폴딩 구현**: AI 생성 프로젝트를 위한 기본 파일/디렉토리 구조(예: `src`, `src/pages`, `src/components`, `package.json`, `tsconfig.json` 등) 생성 스크립트 개발 및 테스트. 필요한 종속성(`npm install`) 자동 설치 기능 포함.
        *   **W6**: **백엔드 API 코드 생성기 개발**: AI가 생성한 `structure.apiEndpoints`를 기반으로 Express 라우트 및 함수를 생성하는 "컴파일러" 구현. (예: `GET /api/posts` 엔드포인트 생성 및 DB 연동 로직 포함).
        *   **W7**: **프론트엔드 UI 코드 생성기 개발**: AI가 생성한 `structure.pages` 및 `structure.components`를 기반으로 React 컴포넌트(`.tsx` 파일)를 생성하는 "컴파일러" 구현. (예: JSX 마크업 및 새 API에서 데이터 가져오는 로직 포함).
        *   **W8**: **데이터베이스 스키마 자동 실행 및 배포 통합**: AI가 생성한 `code.database` SQL 스키마를 사용자 프로젝트를 위한 새 전용 데이터베이스에 대해 실행하는 로직 구현. Vercel/Render와 같은 클라우드 제공업체 API와 통합하여 각 사용자 프로젝트에 대한 새 미리보기 환경을 프로그래밍 방식으로 생성 및 배포. 성공적인 배포 시 사용자에게 라이브, 기능하는 미리보기 URL 제공.

2.  **향상된 AI 제안 (제안 v2)**
    *   **목표**: 사용자 경험을 개선하고 전환율을 높이는 더 정교한 AI 제안 시스템 구현.
    *   **세부 계획**:
        *   **W9**: **제안 엔진 고도화**: 콘텐츠 최적화, SEO, 성능 개선 등 더 복잡한 AI 제안 로직 개발.
        *   **W10**: **A/B 테스트 통합**: 다양한 제안의 효과를 측정하기 위한 A/B 테스트 프레임워크 구축.

3.  **템플릿 라이브러리**
    *   **목표**: 사용자가 쉽게 프로젝트를 시작하고 재사용할 수 있도록 템플릿 기능 제공.
    *   **세부 계획**:
        *   **W11**: **기본 템플릿 시스템 개발**: 미리 정의된 템플릿을 선택하고 적용할 수 있는 UI 및 백엔드 로직 구현.
        *   **W12**: **사용자 정의 템플릿 저장 기능**: 사용자가 자신의 프로젝트를 템플릿으로 저장하고 재사용할 수 있는 기능 구현.

4.  **인증 및 결제**
    *   **목표**: 안정적인 사용자 인증 시스템 구축 및 수익화를 위한 결제 기능 통합.
    *   **세부 계획**:
        *   **W13**: **고급 사용자 인증**: 소셜 로그인, 이메일 인증 등 다양한 인증 방식 구현 (MVP에서 미완료된 경우).
        *   **W14**: **결제 게이트웨이 통합**: 구독 또는 기능 기반 수익화를 위한 결제 시스템 연동.

5.  **공유 및 QR 생성**
    *   **목표**: 게시된 사이트의 접근성과 확산 용이성 증대.
    *   **세부 계획**:
        *   **W15**: **사이트 공유 기능**: 게시된 사이트를 소셜 미디어 등으로 쉽게 공유할 수 있는 기능 구현.
        *   **W16**: **QR 코드 생성**: 게시된 사이트에 대한 빠른 액세스를 위한 QR 코드 자동 생성 기능 구현.

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

## 3. Future Work: From Plan to Live Preview

This section outlines the next major engineering challenge: building the system that takes an AI-generated project plan and turns it into a live, functioning application for the user.

### 1. Project Scaffolding

This is the first step where we create the basic file and directory structure. We will write a script that:

- Creates the directories (`src`, `src/pages`, `src/components`, etc.).
- Creates the initial files (`package.json`, `tsconfig.json`, `src/index.tsx`, etc.).
- Installs the necessary dependencies (like React, Express, etc.) using `npm install`.

### 2. Code Generation

This is the most complex part. We will need to build a "compiler" that takes the AI's JSON output and translates it into actual code:

- **Database:** The `code.database` SQL schema will be executed against a new, dedicated database for the user's project.
- **Backend API:** The `structure.apiEndpoints` will be used to generate the Express routes and functions. For example, a `GET /api/posts` endpoint will be created with code to fetch posts from the database.
- **Frontend UI:** The `structure.pages` and `structure.components` will be used to generate the React components (`.tsx` files). The generator will create the JSX markup and the logic to fetch data from the new API.

### 3. Automated Deployment

Once the code is generated, we need to get it running somewhere:

- **Infrastructure:** We will need to programmatically create a new preview environment for each user's project. This could be done using the APIs of cloud providers like Vercel or Render.
- **Deployment:** Our script will then deploy the generated frontend and backend code to this new environment.
- **Configuration:** The environment will be configured with the correct database credentials and other necessary settings.

### 4. The Preview URL

Finally, once the deployment is successful, we will provide the user with the URL to their live, functioning preview.
