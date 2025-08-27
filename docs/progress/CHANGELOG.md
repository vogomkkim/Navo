# Changelog

All notable changes to this project will be documented in this file.

## [2025-08-27] - Master Developer 시스템 완전 구현 완료 - 실제 작동하는 AI 에이전트 시스템 구축

### Added

- **Master Developer 시스템 완전 구현**: 모든 에이전트의 실제 구현 완성 및 전체 시스템 빌드 성공
  - **ProjectArchitectAgent**: AI 기반 에러 분석 완벽 구현 (12가지 에러 타입, 4단계 심각도)
    - 에러별 맞춤 해결 방법 생성 및 대체 분석 로직
    - 동적 컨텍스트 수집 (코드 스니펫, 커밋 히스토리)
    - AI 분석 실패 시 fallback 시스템
  - **CodeGeneratorAgent**: 실제 파일 생성 시스템 완벽 구현
    - package.json, README.md, 소스 코드 실제 생성
    - 백업 시스템 및 안전한 코드 수정
    - 프로젝트 타입별 맞춤 코드 생성
    - 에러별 맞춤 수정 전략
  - **DevelopmentGuideAgent**: 실제 프로젝트 테스트 실행 완벽 구현
    - npm test 등 실제 테스트 명령어 실행
    - 파일별 타겟 테스트 및 통합 테스트
    - JavaScript 문법 검증 및 파일 내용 유효성 검사
    - 단계별 개발 가이드 및 리소스 링크 생성
  - **RollbackAgent**: 안전한 롤백 시스템 완벽 구현
    - 백업 파일 기반 롤백 시스템
    - 롤백 히스토리 추적 및 안전한 롤백 (이중 백업)
    - 실패한 롤백에 대한 상세한 에러 처리

- **전체 시스템 빌드 성공**:
  - 백엔드 TypeScript 컴파일 완벽 성공 (32개 에러 → 0개 에러)
  - 프론트엔드 Next.js 빌드 완벽 성공
  - 전체 프로젝트 빌드 성공
  - 모든 에러 해결 및 타입 문제 완벽 수정

- **실제 작동 가능한 시스템**:
  - 에러 자동 해결: 런타임 에러 발생 시 AI가 자동으로 분석하고 수정
  - 프로젝트 자동 생성: 자연어 요청으로 완성된 프로젝트 자동 생성
  - 실제 테스트 실행: npm test 등 실제 테스트 명령어 실행
  - 안전한 롤백: 문제 발생 시 자동으로 이전 상태로 복구

## [2025-08-27] - Master Developer 시스템 구현 완료 - 에이전트 기반 프로젝트 생성 아키텍처 구축

### Added

- **Master Developer 시스템 완전 구현**: 에이전트 기반 프로젝트 생성 및 개발 가이드 시스템
  - **ProjectArchitectAgent**: AI 기반 프로젝트 아키텍처 설계 및 기술 스택 선택
  - **CodeGeneratorAgent**: JSON 기반 프로젝트 구조 및 코드 생성 (실제 파일 생성 없음)
  - **DevelopmentGuideAgent**: 단계별 개발 가이드, 타임라인, 리소스 링크 생성
  - **기존 에러 해결 기능과 완벽 호환**: 에러 해결과 프로젝트 생성 모두 지원

- **JSON 기반 가상 파일 시스템**: 실제 파일 없이도 완벽한 개발 환경 제공
  - 프로젝트 구조를 JSON으로 표현하여 DB 저장
  - 프론트엔드에서 동적 렌더링으로 프로젝트 확인 가능
  - 파일 트리, 코드 에디터, 타입 검사 모두 지원
  - Virtual File System으로 실제 개발 경험과 동일

- **프로젝트 생성 워크플로우**: 사용자 요청부터 완성된 프로젝트까지 자동화
  - 사용자: "경매 사이트 만들고 싶어" → 자동 프로젝트 생성
  - ProjectArchitect → CodeGenerator → DevelopmentGuide 순차 실행
  - 각 단계별 결과를 다음 에이전트에게 전달하여 연속 처리

- **에이전트 아키텍처 재설계**: 기존 에러 해결 시스템을 확장하여 Master Developer 시스템 구축
  - `ErrorAnalyzerAgent` → `ProjectArchitectAgent` 확장
  - `CodeFixerAgent` → `CodeGeneratorAgent` 확장
  - `TestRunnerAgent` → `DevelopmentGuideAgent` 확장
  - 모든 에이전트가 프로젝트 생성과 에러 해결을 동시에 지원

### Changed

- **에이전트 파일 구조 완전 재구성**: 새로운 Master Developer 시스템에 맞게 파일명과 클래스명 변경
  - `errorAnalyzerAgent.ts` → `projectArchitectAgent.ts`
  - `codeFixerAgent.ts` → `codeGeneratorAgent.ts`
  - `testRunnerAgent.ts` → `developmentGuideAgent.ts`
  - 기존 기능은 모두 유지하면서 새로운 기능 추가

- **프론트엔드 UI/UX 대폭 개선**: 현대적이고 사용자 친화적인 인터페이스 구현
  - 채팅 인터페이스 최적화 (3:7 비율, 스크롤 제거)
  - 한국어 현지화 완료 (모든 UI 텍스트 한국어로 번역)
  - 반응형 레이아웃 및 미니멀 디자인 적용
  - 채팅 메시지 버블 시스템 및 사용자/어시스턴트 구분

### Technical Details

- **JSON 프로젝트 구조 예시**:

  ```json
  {
    "name": "auction-site",
    "structure": {
      "src/": {
        "components/": {
          "Header.tsx": { "content": "실제 코드", "type": "tsx" },
          "AuctionList.tsx": { "content": "실제 코드", "type": "tsx" }
        },
        "pages/": { "index.tsx": { "content": "실제 코드", "type": "tsx" } }
      },
      "package.json": { "content": "실제 내용", "type": "json" }
    }
  }
  ```

- **에이전트 우선순위 시스템**:
  - ProjectArchitectAgent (우선순위 1): 프로젝트 설계
  - CodeGeneratorAgent (우선순위 2): 코드 생성
  - DevelopmentGuideAgent (우선순위 3): 개발 가이드

### Files Changed

- **11개 파일 변경**, **2,030줄 추가**, **723줄 삭제**
- 에이전트 파일들 완전 재구성
- JSON 기반 프로젝트 생성 시스템 구축
- 프론트엔드 UI 개선 및 현지화

## [2025-08-25] - 인증 시스템 scrypt 전환 및 로깅 시스템 대폭 개선

### Added

- **인증 시스템 완전 전환**: bcrypt에서 scrypt로 완전 전환
  - 기존 사용자 비밀번호 scrypt로 마이그레이션 완료
  - 로그인 시스템 정상화 및 500 에러 해결
  - bcrypt 관련 모든 코드 및 의존성 제거

- **로깅 시스템 대폭 개선**: 불필요한 로그 제거 및 최적화
  - REQ 로그 완전 제거 (에러만 출력)
  - 중복 timestamp 제거
  - scrypt 파라미터 최적화 (메모리 사용량 감소)
  - 로그 레벨별 제어 시스템 구현

- **개발 환경 개선**: Webpack 핫 리로드 및 API 경로 수정
  - Webpack 설정으로 프론트엔드 핫 리로드 구현
  - 프론트엔드 API 경로 `/api/auth/*`로 수정
  - 404/500 에러 해결

- **코드 정리 및 브랜치 관리**
  - 불필요한 의존성 제거
  - 로컬/원격 브랜치 정리 (main만 유지)
  - 커밋 및 푸시 완료

## Unreleased

### Added

- **Intelligent Logging System**: Smart HTTP request/response logging middleware
  - **Automatic Request Filtering**: Static assets (CSS, JS, images) filtered out by default
  - **Smart Log Levels**: Different log levels for different request types (API, auth, health checks)
  - **Performance Monitoring**: Automatic detection and warning for slow requests
  - **Configurable Behavior**: Environment variable-based configuration for different environments
  - **Business Focus**: Logs focus on actual business value rather than noise
  - **Backward Compatibility**: Existing logging behavior preserved when no config is set

- **자동 에러 해결 시스템 Phase 1.2 완료**: 핵심 에이전트 3개 모두 구현 완료
  - **Code Fixer Agent**: AI 제안에 따른 자동 코드 수정 및 백업 시스템 구축
    - 에러 타입별 맞춤 수정 전략 (Null Reference, Element Not Found, Type Error)
    - 자동 백업 시스템 (최대 5개 백업 파일 유지, 오래된 백업 자동 정리)
    - 안전한 파일 수정 (백업 생성, 수정 실패 시 롤백 준비)
    - HTML 요소 자동 생성 (누락된 DOM 요소 자동 추가)
  - **Test Runner Agent**: 에러 해결 여부 확인 및 애플리케이션 상태 점검
    - 에러 재현 시도 (여러 번 테스트하여 안정성 확보)
    - 애플리케이션 상태 종합 진단 (DOM 상태, JavaScript 에러, 필수 요소 확인)
    - 기능별 테스트 (에러와 관련된 기능의 정상 작동 여부 검증)
    - 재시도 로직 (점진적 대기 시간 증가로 안정성 향상)
  - **통합 테스트 시스템**: 모든 에이전트를 통합하여 테스트할 수 있는 환경 구축
    - 단계별 테스트 (에러 분석 → 코드 수정 → 해결 확인)
    - 개별 에이전트 테스트 (각 에이전트의 독립적인 기능 검증)
    - 다양한 에러 시나리오 테스트 (자동 수정 가능/불가능한 에러 구분)

- **자동 에러 해결 시스템 Phase 1 완료**: AI 기반 런타임 에러 자동 복구 시스템의 핵심 아키텍처 구축
  - **에이전트 기반 아키텍처**: `ErrorResolutionAgent` 인터페이스 및 `BaseAgent` 추상 클래스 구현
  - **에러 분류 시스템**: 12가지 에러 타입과 4단계 심각도 분류 체계 구축
  - **Error Analyzer Agent**: Gemini API를 활용한 AI 기반 에러 분석 및 해결 방법 제시
  - **에러 해결 관리자**: `ErrorResolutionManager`와 `AgentRegistry`를 통한 에이전트 관리
  - **안전한 에러 처리**: 전역 에러 캐치, 백업 및 롤백 시스템, 에러 로깅
  - **테스트 인프라**: 다양한 에러 시나리오를 테스트할 수 있는 테스트 파일 생성
  - **코드 품질**: ESLint 규칙에 맞춘 코드 정리 및 일관된 포맷팅 적용

- **컴포넌트 시스템 아키텍처 개선**: 플랫폼과 사용자 컴포넌트 로직 분리
  - **1단계**: 컴포넌트 렌더링 로직 분리
    - `components.js` 생성하여 컴포넌트 렌더링 로직 분리
    - `app.js`에서 하드코딩된 컴포넌트 로직 제거
    - `index.html`에 ES6 모듈 지원 추가
    - 플랫폼 로직과 컴포넌트 렌더링 로직 명확히 분리
  - **2단계**: 동적 컴포넌트 로딩 시스템 구현
    - `component_definitions` 테이블 스키마 추가
    - `componentHandlers.ts` 생성하여 컴포넌트 정의 관리 API 구현
    - API 라우트에 컴포넌트 관련 엔드포인트 추가 (`/api/components`, `/api/components/seed`)
    - `components.js`에 동적 컴포넌트 로딩 및 템플릿 렌더링 시스템 구현
    - `app.js`에서 컴포넌트 정의 동적 로드
    - 기본 컴포넌트 4개 시드 (Header, Hero, Footer, AuthForm)
    - 하드코딩된 컴포넌트에서 데이터베이스 기반 컴포넌트로 전환
  - **3-1단계**: 자연어 컴포넌트 생성 UI 구현
    - 복잡한 개발자용 컴포넌트 생성 폼 제거
    - 자연어 입력 기반 UI로 교체 (일반 사용자 친화적)
    - 사용자 친화적인 예시문 포함
    - 간단한 텍스트 영역 + 생성 버튼 구조
    - 상태 표시 UI 추가 (로딩/성공/에러)
    - 컴포넌트 CRUD API 구현 완료
- **인증 시스템 강화**: `getUserIdFromToken` 함수 추가로 토큰 기반 사용자 인증 개선
- **프로젝트 관리 API**: `projectHandlers.ts` 생성하여 프로젝트/페이지 관리 기능 구현

- **데이터베이스 및 보안 강화**: Prisma 클라이언트 추가, 데이터베이스 상호 작용 개선.
- **인증 기능**: 웹 애플리케이션에 로그아웃 기능 및 인증 검사 추가.
- **개발 스크립트 개선**: 데이터베이스 작업 및 서버 관리를 위한 스크립트 향상.
- **AI Intent Parser**: 사용자 요청을 분석하여 완전한 프로젝트 구조를 생성하는 시스템 구현
  - `/api/generate-project` 엔드포인트 추가
  - 데이터베이스 스키마, 페이지 구조, 컴포넌트, API 엔드포인트 자동 설계
  - Gemini AI를 활용한 지능형 프로젝트 아키텍처 생성
- **프로젝트 생성 UI**: 프론트엔드에서 프로젝트 요구사항을 입력하고 결과를 시각적으로 표시
  - 프로젝트 설명, 기능, 타겟 오디언스, 비즈니스 타입 입력 폼
  - 생성된 프로젝트 구조의 상세 정보 표시
- **확장된 타입 시스템**: AI 프로젝트 생성을 위한 새로운 타입 정의
  - `ProjectStructure`, `DatabaseSchema`, `PageDefinition` 등
  - 타입 안전한 프로젝트 구조 처리
- **Hot-reload 개발 환경**: 개발 효율성 향상을 위한 자동 재시작 시스템
  - `tsx`와 `nodemon`을 활용한 TypeScript 파일 변경 감지
  - `npm run dev` 명령어로 개발 서버 실행
- AI 제안 v1: AI 제안 생성 및 저장 기능 구현 (더미 데이터 시딩 포함).
- `deploySite` 노드 개선: 대용량 페이로드 처리를 위한 스트리밍 방식 적용 및 URL 반환 문제 해결.
- 서버 로깅: 서버 요청 및 핸들러 함수에 대한 상세 로깅 추가.
- 타입 정의: `BuildPageOutput` 타입 추가로 타입 안정성 향상.

### Changed

- **ESLint 구성 업데이트**: 코드 형식 지정 및 일관성 향상.
- **서버 코드 리팩토링**: 더 나은 구성 및 명확성을 위해 코드 구조 개선.
- **문서 업데이트**: 제품 비전, 로드맵, MVP 범위 문서 개선 (특히 사용자 데이터 소유권).
- **Vercel 배포 설정**: `vercel.json`에서 지원하지 않는 `analytics` 속성 제거
- `deploySite` 노드: 플레이스홀더에서 실제 파일 배포 기능으로 전환.
- `.gitignore` 업데이트: 생성된 Prisma 파일 제외.

### Fixed

- `deploySite` 노드: `undefined` URL 반환 문제 해결.
- `deploySite` 노드: 중복 선언 문제 해결.
- AI 제안 저장: `suggestions` 테이블의 외래 키 제약 조건 위반 문제 해결 (더미 사용자 및 프로젝트 시딩).

## [0.1.0] - Initial

- Seed documentation under `docs/` and `adr/`.
- Project hygiene files added.
- Orchestrator skeleton (TypeScript) scaffolding.
