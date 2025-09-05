# Navo 프로젝트 개발 원칙 (Development Principles)

이 문서는 Navo 프로젝트의 코드 품질과 일관성을 유지하기 위한 핵심 개발 원칙을 정의합니다. 모든 코드는 리팩토링 과정 및 이후의 모든 개발 과정에서 아래 원칙을 준수해야 합니다.

## 1. 아키텍처: 수직적 모듈 구조 (Vertical Slicing)

- **구조**: 코드는 기능(도메인) 단위의 `modules/*` 디렉토리 안에 구성합니다.
- **의존성 방향**: 각 모듈 내에서 의존성은 `Controller` → `Service` → `Repository`의 단방향으로 흐릅니다.
- **모듈 간 참조**: 모듈 간의 직접적인 참조(import)는 금지합니다. 모듈 간 통신이 필요한 경우, `packages/shared`에 정의된 DTO나 타입을 통하거나, `lib`에 정의된 공통 인터페이스를 통해야 합니다.

## 2. 네이밍 및 경로

- **파일 네이밍**: 모듈 내의 파일은 `<name>.<layer>.ts` 규칙을 따릅니다. (예: `auth.controller.ts`, `auth.service.ts`)
- **경로 별칭**: `tsconfig.json`에 정의된 경로 별칭 사용을 원칙으로 합니다. (`@/modules/*`, `@/shared/*`, `@/lib/*`)

## 3. 공유 패키지 (`packages/shared`)

- **역할**: 프론트엔드와 서버가 공유하는 순수한 '계약'만을 포함합니다.
- **포함 대상**: 타입 정의(interfaces, types), DTO, 유효성 검사 스키마(zod), 표준 에러 코드 등.
- **금지 대상**: 런타임 의존성을 가진 코드, 비즈니스 로직, 특정 프레임워크에 종속적인 코드를 포함하지 않습니다.
- **Deep Import 금지**: 공유 패키지를 사용할 때는 반드시 패키지 진입점(`@navo/shared`)을 통해 `import` 해야 합니다. 내부 파일 경로에 직접 접근하는 것(예: `@navo/shared/src/some/file`)은 금지됩니다. 이는 `package.json`의 `exports` 필드로 강제되며, 모듈 해석의 일관성을 보장합니다.

## 4. 에러 및 로깅

- **에러 규격**: 표준 에러 규격(`code`, `message`, `statusCode`)을 `shared` 패키지에 정의하고, 전역 에러 미들웨어에서 이를 사용하여 응답합니다.
- **로깅**: 모든 로그는 JSON 형식으로 출력하며, 요청을 추적할 수 있도록 고유한 요청 ID(Trace ID)를 포함해야 합니다.
- **로그 메시지**: 모든 로그 메시지는 한글로 작성하는 것을 원칙으로 합니다.

## 5. 데이터베이스 및 트랜잭션

- **트랜잭션 경계**: 트랜잭션은 비즈니스 로직의 단위인 `Service` 계층에서 시작하고 종료하는 것을 원칙으로 합니다.
- **리포지토리 역할**: `Repository`는 데이터베이스에 대한 CRUD 작업만을 담당하며, 어떠한 비즈니스 로직도 포함해서는 안 됩니다.

## 6. 패키지 관리 및 스크립트

- **패키지 매니저**: 프로젝트는 `pnpm` 워크스페이스를 사용하여 모노레포를 관리합니다. `npm`이나 `yarn`의 사용은 금지됩니다.
- **의존성 설치**: `pnpm install` 명령을 사용하여 모든 워크스페이스의 의존성을 설치합니다.
- **스크립트 실행**:
  - 전체 워크스페이스 대상: `pnpm -r run <script_name>` (예: `pnpm -r run build`)
  - 특정 워크스페이스 대상: `pnpm --filter <package_name> run <script_name>` (예: `pnpm --filter @navo/server run dev`)
- **의존성 추가**:
  - 특정 워크스페이스에 추가: `pnpm add <package> --filter <package_name>`
  - 루트(개발용): `pnpm add <package> -wD`
