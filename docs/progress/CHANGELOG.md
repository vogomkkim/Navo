# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

### Added

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
- **인증 시스템 강화**: `getUserIdFromToken` 함수 추가로 토큰 기반 사용자 인증 개선
- **프로젝트 관리 API**: `projectHandlers.ts` 생성하여 프로젝트/페이지 관리 기능 구현

- **데이터베이스 및 보안 강화**: Prisma 클라이언트 및 bcrypt 종속성 추가, 데이터베이스 상호 작용 개선.
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
