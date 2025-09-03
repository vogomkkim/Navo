# 백엔드 구조 리팩토링 최종 계획 (v3)

## 1. 배경 및 목표

기존 백엔드 구조의 복잡성을 해결하고, 전문적인 리뷰 의견을 반영하여 장기적인 관점에서 유지보수성과 확장성이 뛰어난 아키텍처를 구축하는 것을 목표로 합니다.

## 2. 최종 아키텍처

### 핵심 원칙

1.  **모노레포 구조**: `frontend`, `server`, `packages/*` 를 워크스페이스로 관리하여 코드 공유와 독립적 개발을 지원합니다.
2.  **수직적 모듈 구조 (Vertical Slicing)**: 기능(도메인) 중심의 모듈로 코드를 구성하여 높은 응집도와 낮은 결합도를 유지합니다.

### 최종 목표 구조

```
Navo/
├── packages/
│   └── shared/         # 프론트/서버 공용 패키지 (타입, zod 스키마 등)
├── frontend/
│   └── ...
├── server/
│   ├── src/
│   │   ├── modules/      # 기능별 독립 모듈
│   │   │   ├── agents/   # 예시: agents 모듈
│   │   │   │   ├── agents.controller.ts
│   │   │   │   ├── agents.service.ts
│   │   │   │   └── agents.repository.ts
│   │   │   └── ...
│   │   ├── config/       # 전역 설정
│   │   └── lib/          # 공통 라이브러리 (로거 등)
│   ├── package.json
│   └── server.ts
├── package.json
└── ...
```

## 3. 개발 정책 및 표준

리팩토링 이후, 아래의 정책을 준수하여 코드의 일관성과 품질을 유지합니다.

### 1. 모듈 경계 및 의존성 규칙

- **의존성 방향**: `Controller` → `Service` → `Repository` 단방향으로 흐릅니다.
- **모듈 간 참조**: 모듈 간 직접 참조는 금지합니다. 필요한 경우 `shared` 패키지(타입, DTO) 또는 `lib`의 인터페이스를 통해 통신합니다.
- **Lint 규칙**: 위 의존성 규칙을 강제하기 위해 ESLint 플러그인(`eslint-plugin-import`)을 설정합니다.

### 2. 에러 및 로깅 표준

- **에러 규격**: 에러 코드, 메시지, 상태 코드를 포함하는 표준 에러 규격을 `shared` 패키지에 정의하고, 전역 에러 미들웨어에서 일관되게 처리합니다.
- **로깅**: 구조화된 JSON 로그를 사용합니다. 모든 로그에는 요청 ID(Trace ID)를 포함하여 추적성을 높입니다.

### 3. 데이터베이스 및 트랜잭션 정책

- **트랜잭션 경계**: 비즈니스 로직의 단위인 `Service` 계층에서 트랜잭션을 시작하고 종료하는 것을 원칙으로 합니다.
- **리포지토리 역할**: `Repository`는 순수 데이터 접근(CRUD) 로직만 담당하며, 비즈니스 로직을 포함하지 않습니다.

## 4. 실행 계획 및 체크리스트

안정성을 위해 아래 체크리스트에 따라 점진적으로 리팩토링을 실행합니다.

- [x] **1단계: 기반 설정**
  - [x] `navo` → `server` 디렉토리 이름 변경
  - [x] 루트 `package.json`에 `workspaces` (`frontend`, `server`, `packages/shared`) 등록
  - [x] `server/package.json` 및 `packages/shared/package.json` 생성 및 의존성/스크립트 이전
  - [x] `tsconfig.json`에 경로 별칭 확정 (`@/modules/*`, `@/shared/*`)
  - [x] 서버 전용 TS 설정(`server/tsconfig.json`) 및 `server/package.json` 빌드/시작 스크립트 정리

- [x] **2단계: 정책 및 도구 적용**
  - [x] 의존성 규칙을 위한 `ESLint` 설정
  - [x] 전역 에러 미들웨어 및 로깅 라이브러리(`lib`) 구현

- [x] **3단계: 점진적 모듈 이전**
  - [x] 임시 호환성 계층(re-export) 배치 (모듈 이전 시 순차적으로 진행)
  - [x] 모듈 단위 이전 절차(반복)
    - [x] (a) 기존 경로 → 새 모듈로 re-export 파일 추가
    - [x] (b) 새 모듈에 types/repository/service/controller 정리 및 의존성 제거(\_backup 참조 제거)
    - [x] (c) DB/유틸/설정 import를 별칭(`@/db/*`, `@/lib/*`, `@/shared/*`)으로 교체
    - [x] (d) 서버 부트스트랩에 새 모듈 라우팅 연결(필요 시)
    - [x] (e) 계약/유닛/통합 테스트 추가 및 green 확인
    - [x] (f) 기존 코드의 import 경로 점검: 새 경로 사용으로 점진 전환
    - [x] (g) 모듈 완료 시 해당 re-export soft deprecate 처리(주석/로그)
  - [x] 첫 이전 대상 모듈 선정 (예: `auth`)
  - [x] `server/src/modules/auth` 스켈레톤 생성(controller/service/repository)
  - [x] `auth` 모듈을 `server/src/modules/auth`로 이전 및 새 구조에 맞게 리팩토링
  - [x] `auth` 모듈에 대한 단위/통합 테스트 작성 및 검증
  - 모듈별 진행 현황(2-line per module, x=완료)
    모듈별로 핵심부터(최소 기능/호환) 우선합니다.
    1차(핵심): 라우트/컨트롤러 연결(d), 레거시 re-export(a)
    2차(정리): 타입/리포/서비스 분리(b), 별칭 일원화(c)
    3차(품질): 테스트(e)
    4차(전환): 기존 import 전환(f), soft deprecate(g)

    legend: [a, b, c, d, e, f, g]

    ai
    [a, b, c, d, e, f, g]
    [x, x, x, x, x, x, x]

    agents
    [a, b, c, d, e, f, g]
    [x, x, x, x, x, , ]

    auth
    [a, b, c, d, e, f, g]
    [x, x, x, x, x, x, x]

    projects
    [a, b, c, d, e, f, g]
    [x, x, x, x, , , ]

    components
    [a, b, c, d, e, f, g]
    [x, x, x, x, , , ]

    analytics
    [a, b, c, d, e, f, g]
    [x, x, x, x, , , ]

    events
    [a, b, c, d, e, f, g]
    [x, x, x, x, x, , ]

    pages
    [a, b, c, d, e, f, g]
    [x, x, x, x, , , ]

    static
    [a, b, c, d, e, f, g]
    [x, x, x, x, x, x, x]

    health
    [a, b, c, d, e, f, g]
    [x, x, x, x, , , ]

    db
    [a, b, c, d, e, f, g]
    [x, x, x, , , , ]

- [ ] **4단계: 최종 정리**
  - [ ] 모든 모듈 이전 완료 후, 호환성 계층 제거
  - [x] 전체 시스템 통합 테스트 및 최종 검증 (server 단위/통합 테스트 green, 2025-01-27)

## 5. 최근 진행 상황 (2024-12-19)

### 완료된 작업
- **agents 모듈**: Repository, Service, Controller 계층 완성
- **events 모듈**: Repository, Service, Controller 계층 완성
- **health 모듈**: 기본 구조 완성 (간단한 health check)
- **db 모듈**: 기본 Repository 구조 완성
- **projects 모듈**: Repository, Service, Controller 계층 완성

### 다음 우선순위
1. **테스트 작성**: 완료된 모듈들에 대한 단위/통합 테스트 작성
2. **import 경로 전환**: 기존 코드에서 새 모듈 경로로 점진적 전환
3. **남은 모듈들**: components, analytics, pages 모듈 리팩토링

## 6. 리뷰 피드백 반영 (2024-12-19)

### ✅ 해결된 문제들
1. **Repository 구현 완료**: `agents.repository.ts`에 실제 데이터베이스 연동 로직 구현
   - `projectPlans`, `virtualPreviews` 테이블 스키마 추가
   - CRUD 작업 완전 구현
2. **의존성 규칙 준수**: 모듈 간 직접 참조 제거
   - `authenticateToken`을 전역 미들웨어로 등록
   - `app.authenticateToken` 사용으로 모듈 간 결합도 감소

### 🔄 진행 중인 작업
1. **테스트 작성**: 단위/통합 테스트 작성 필요
2. **import 경로 전환**: 기존 코드에서 새 모듈 경로로 점진적 전환

### 📋 다음 단계
1. **테스트 코드 작성**: `AgentsService`와 `AgentsController` 중심으로 단위/통합 테스트
2. **남은 모듈들**: `components`, `analytics`, `pages` 모듈 리팩토링
3. **최종 검증**: 전체 시스템 통합 테스트

## 7. 우선순위별 진행 상황 (2024-12-19)

### 🎯 우선순위별 완료 현황

#### 1차 (핵심): 라우트/컨트롤러 연결(d), 레거시 re-export(a)
- ✅ **완료**: `ai`, `auth`, `static`, `agents`, `events`, `health`, `db`, `projects`, `components`, `analytics`, `pages`

#### 2차 (정리): 타입/리포/서비스 분리(b), 별칭 일원화(c)
- ✅ **완료**: `ai`, `auth`, `static`, `agents`, `events`, `health`, `db`, `projects`, `components`, `analytics`, `pages`

#### 3차 (품질): 테스트(e)
- ✅ **완료**: `ai`, `auth`, `static`, `agents`, `events`, `health`, `pages`, `components`, `analytics`
- ⏳ **대기**: `db`, `projects`

#### 4차 (전환): 기존 import 전환(f), soft deprecate(g)
- ✅ **완료**: `ai`, `auth`, `static`, `pages`, `components`, `analytics`
- ⏳ **대기**: `agents`, `events`, `health`, `db`, `projects`

### 📋 다음 우선순위 작업

1. `projects` 모듈: 테스트(e) 보강 및 저장소 반환타입 정규화(null 매핑) 추가 검증
2. `db` 모듈: 기본 리포지토리 계약에 대한 단위 테스트 추가
3. import 경로 전환(f) 잔여 모듈 적용 및 호환 레이어 제거(g) 준비
