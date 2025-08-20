# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

### Added

- AI 제안 v1: AI 제안 생성 및 저장 기능 구현 (더미 데이터 시딩 포함).
- `deploySite` 노드 개선: 대용량 페이로드 처리를 위한 스트리밍 방식 적용 및 URL 반환 문제 해결.
- 서버 로깅: 서버 요청 및 핸들러 함수에 대한 상세 로깅 추가.
- 타입 정의: `BuildPageOutput` 타입 추가로 타입 안정성 향상.

### Changed

- `deploySite` 노드: 플레이스홀더에서 실제 파일 배포 기능으로 전환.

### Fixed

- `deploySite` 노드: `undefined` URL 반환 문제 해결.
- `deploySite` 노드: 중복 선언 문제 해결.
- AI 제안 저장: `suggestions` 테이블의 외래 키 제약 조건 위반 문제 해결 (더미 사용자 및 프로젝트 시딩).

## [0.1.0] - Initial

- Seed documentation under `docs/` and `adr/`.
- Project hygiene files added.
- Orchestrator skeleton (TypeScript) scaffolding.
