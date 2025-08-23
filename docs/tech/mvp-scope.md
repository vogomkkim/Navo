# MVP Scope v0.9

## Acceptance Criteria

### ✅ **Completed Features**

- **AI Intent Parser**: 사용자 요청을 분석하여 완전한 프로젝트 구조 생성 및 영속화
  - Gemini AI를 활용하여 데이터베이스 스키마, 페이지 구조, 컴포넌트 정의, API 엔드포인트 자동 설계 및 생성된 구조를 데이터베이스에 영속화
- **Hot-reload 개발 환경**: TypeScript 파일 변경 시 자동 서버 재시작
- **기본 AI 제안 시스템**: AI 기반 스타일 및 복사 제안 생성 및 저장
- **이벤트 추적**: 페이지 뷰, 클릭, 채팅 명령 등 사용자 액션 추적
- **Draft preview (database integrated)**: Initial integration for fetching draft data from the database. Further optimization needed to consistently meet the ≤ 10s target.
- **Publish**: (subdomain auto, success URL, and rollback last 3 builds integrated with Vercel)
- **Analytics: track `view` and `click`**: Implemented event tracking for page views and clicks.



## SLO Targets

- Editor perceived latency ≤ 200 ms
- Average publish time ≤ 60 s
- Availability ≥ 99.5%
- **AI Project Generation**: Response time ≤ 30 s for complex project structures

## Minimum Events

- `view:page`
- `click:cta`
- `submit:form`
- `purchase`
- `editor:change`
- `publish:success`
- **`project:generated`** - AI 프로젝트 생성 완료
- **`chat:command`** - AI 채팅 명령 실행

## Notes

- Keep end‑user experience simple; hide infra details
- Prefer plain language and visible results
- **AI Intent Parser now enables non-developers to generate complete project structures**
- **Project generation includes database schema, API endpoints, and component architecture**

See `README.md` for the canonical list and `docs/plan/roadmap.md` for milestones.