# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

### Added

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

- **Vercel 배포 설정**: `vercel.json`에서 지원하지 않는 `analytics` 속성 제거
- `deploySite` 노드: 플레이스홀더에서 실제 파일 배포 기능으로 전환.

### Fixed

- `deploySite` 노드: `undefined` URL 반환 문제 해결.
- `deploySite` 노드: 중복 선언 문제 해결.
- AI 제안 저장: `suggestions` 테이블의 외래 키 제약 조건 위반 문제 해결 (더미 사용자 및 프로젝트 시딩).

## [0.1.0] - Initial

- Seed documentation under `docs/` and `adr/`.
- Project hygiene files added.
- Orchestrator skeleton (TypeScript) scaffolding.
