결론 먼저: React(Next.js) + TypeScript로 가. Svelte는 “1명+AI 에이전트 주도” 구조에서 이점이 적다. 이유와 실행안 바로 줄게.

왜 React(Next)인가

에이전트 친화성: 공개 예제·플러그인·질문/답변이 압도적으로 많아서 AI가 정답에 가깝게 코드를 생성한다. 디버깅 시간↓.

부품 조달력: shadcn/ui, TanStack Query, React Hook Form, Zod 등 검증된 조합으로 “붙여서 바로 씀”.

리스크 분산: 인력 교체·외주·채용 때 React 경험자를 구하기가 훨씬 쉽다.

백엔드 전환 내성: 지금 Node BFF → 최종 Go로 바꿔도 프론트 계약(OpenAPI)만 유지하면 프론트 수정 최소화.

Svelte는 가볍고 빠르지만, 고급 라이브러리/도구의 “간극”을 사람이 메워야 하는 경우가 잦다. 에이전트가 만든 코드의 빈틈을 사람이 메꾸는 시간이 늘 수 있음.

최소 스택(복붙 체크리스트)

Frontend

Next.js (App Router) + TypeScript + Tailwind + shadcn/ui

TanStack Query + React Hook Form + Zod

Auth: (현재 Supabase라면) @supabase/ssr 또는 OAuth 프록시

상태: 서버 캐싱 중심(TanStack), 전역 상태 최소화(Zustand 선택적)

BFF(현행)

Fastify(+TypeScript) 추천(Express도 OK)

Zod/TypeBox(+ajv)로 입출력 스키마 강제

pino 로깅, helmet, rate-limit, CORS 최소 허용

Redis 캐시(핫 엔드포인트), OpenTelemetry trace 전파

Core Backend(최종)

Go + Chi/Fiber/Gin 중 하나

OpenAPI-first: 스펙 → 코드생성(ts/go 타입 동시 생성)

DB/권한은 서비스 내부, BFF는 얇게

에이전트 중심 개발 플로우(실전)

스펙 먼저: OpenAPI(YAML) 작성 → openapi-typescript/oapi-codegen으로 타입 생성

에이전트에 제시: “이 스펙 준수해서 Next 페이지/훅/서버액션 작성” 프롬프트

계약 테스트: Prism/Mock 서버로 프론트만 먼저 통과

관측성 기본값: Sentry(프론트/서버), request-id, traceparent 전파

품질 가드: tsconfig "strict": true, ESLint/Biome, Playwright(핵심 플로우 3개)

보안 관점(너 스타일에 맞게 깔끔하게)

토큰 최소 전달: BFF에서 역할/권한 스냅샷 추출 → 다운스트림 최소 권한 컨텍스트만 전달

스키마 검증: 모든 외부 입력을 Zod/ajv로 검증(프론트 폼/서버 핸들러 양쪽)

시크릿 경계: 프론트 .env 공개값 최소, 서버에서만 비밀키 사용

의존성 잠금: pnpm + lockfile, Renovate로 주기적 업그레이드

“정말 Svelte가 나은 경우”

아주 작은 위젯/임베드, 의존성 거의 없음, UX 실험 적음, 번들 크기 극한이 목표일 때.
그 외엔 React가 총비용(TCO)이 낮다.

바로 시작 템플릿

Next: npx create-next-app@latest (TS, App Router)

UI: shadcn/ui 설치 → 버튼/폼 컴포넌트 도입

데이터: TanStack Query + React Query Devtools

검증: Zod + RHF Resolver

에러/로그: Sentry + pino-http(서버)

계약: /spec/openapi.yaml + 코드생성 스크립트

요약: 에이전트가 코딩하고 너는 오류만 수습한다는 모델에선, 생태계·문서·예제 최대치인 React(Next)가 디버깅 코스트를 가장 줄여준다. Go 전환은 OpenAPI-first로 계약 고정만 지키면 부드럽게 간다.
