# Go 마이그레이션 계획

## 📋 개요

현재 Node.js 기반 서버를 Go로 점진적 마이그레이션하여 성능 향상과 리소스 효율성을 달성하는 계획입니다.

## 🎯 목표

- **성능 향상**: 응답 시간 90% 감소 (다른 회사 사례 기준)
- **리소스 효율성**: 컴퓨팅 리소스 70% 감소
- **동시성 개선**: 복잡한 워크플로우 병렬 처리 최적화
- **안정성**: 점진적 마이그레이션으로 서비스 중단 최소화

## 🏗️ 현재 아키텍처 분석

### 기술 스택

- **웹 프레임워크**: Fastify (Node.js)
- **데이터베이스**: PostgreSQL + Drizzle ORM
- **인증**: JWT
- **실시간 통신**: SSE (Server-Sent Events)
- **AI 통합**: Google Generative AI
- **언어**: TypeScript

### 핵심 모듈

1. **워크플로우 엔진** (Orchestrator, WorkflowService, WorkflowExecutor)
2. **프로젝트 관리** (VFS, Projects)
3. **AI 통합** (IntentAnalyzer, AI Planner)
4. **실시간 통신** (SSE)

## 🚀 마이그레이션 전략

### 옵션 1: 하이브리드 아키텍처 (권장)

```
Frontend (Next.js)
    ↓ HTTP/SSE
API Gateway (Nginx/Cloudflare)
    ├── /api/workflow/* → Go Server (고성능 워크플로우)
    ├── /api/sse/* → Go Server (실시간 통신)
    └── /api/* → Node.js Server (기존 API)
    ↓
PostgreSQL (공유)
    ↓
Google Generative AI (공유)
```

### 옵션 2: 점진적 마이그레이션

```
Frontend (Next.js)
    ↓ HTTP/SSE
Node.js Server (Fastify) - 기존
    ├── /api/auth/* (유지)
    ├── /api/projects/* (유지)
    └── /api/workflow/* → Go Microservice (새로 추가)
    ↓
PostgreSQL (공유)
    ↓
Google Generative AI (공유)
```

### 옵션 3: 완전 마이그레이션

```
Frontend (Next.js)
    ↓ HTTP/SSE
Go Server (Gin/Echo)
    ├── /api/auth/* (Go로 포팅)
    ├── /api/projects/* (Go로 포팅)
    ├── /api/workflow/* (Go로 포팅)
    ├── /api/sse/* (Go로 포팅)
    └── /api/health (Go로 포팅)
    ↓
PostgreSQL + GORM
    ↓
Google Generative AI
```

## 🎯 권장: 하이브리드 아키텍처

### Go 서버 담당 영역

- **워크플로우 엔진**: 병렬 처리 최적화
- **SSE 관리**: Goroutine으로 효율적 동시성
- **실시간 브로드캐스팅**: Channel 기반 통신

### Node.js 서버 담당 영역

- **인증 시스템**: JWT 처리
- **프로젝트 관리**: VFS 작업
- **파일 업로드/다운로드**: 정적 파일 서빙

## 🔧 기술 구현

### Go 웹 프레임워크 선택

- **Gin**: 가장 인기, Express 스타일
- **Fiber**: Express와 유사한 API
- **Echo**: 성능 중심, 미들웨어 풍부

### 데이터베이스 레이어

- **Drizzle ORM** → **GORM** 또는 **sqlx**
- PostgreSQL 연결 유지
- 트랜잭션 관리 개선

### AI 통합

- Google Generative AI Go SDK 사용
- 기존 프롬프트 로직 포팅

## 📊 성능 비교 예상

### 워크플로우 실행

- **Node.js**: 순차적 실행, 메모리 사용량 높음
- **Go**: 병렬 실행 (Goroutine), 메모리 효율적

### SSE 연결

- **Node.js**: EventEmitter 기반
- **Go**: Channel 기반, 더 효율적인 동시성

### AI 요청 처리

- **Node.js**: Promise 체인
- **Go**: Goroutine + Channel, 더 빠른 응답

## 🛠️ 구현 단계

### 1단계: Go 워크플로우 엔진 프로토타입

```go
type WorkflowExecutor struct {
    tools map[string]Tool
    dependencies *DependencyAnalyzer
    performance *PerformanceMonitor
}

func (we *WorkflowExecutor) Execute(plan Plan) <-chan ExecutionResult {
    resultChan := make(chan ExecutionResult)

    go func() {
        defer close(resultChan)
        // 워크플로우 실행 로직
    }()

    return resultChan
}
```

### 2단계: SSE 최적화

```go
type SSEManager struct {
    connections map[string][]*SSEConnection
    mutex       sync.RWMutex
}

func (s *SSEManager) Broadcast(projectId string, event Event) {
    s.mutex.RLock()
    defer s.mutex.RUnlock()

    for _, conn := range s.connections[projectId] {
        select {
        case conn.channel <- event:
        default:
            s.removeConnection(projectId, conn)
        }
    }
}
```

### 3단계: API Gateway 설정

```nginx
location /api/workflow/ {
    proxy_pass http://go-server:8080;
}

location /api/sse/ {
    proxy_pass http://go-server:8080;
}

location /api/ {
    proxy_pass http://nodejs-server:3001;
}
```

## 🌐 호스팅 플랫폼

### 무료 Go 호스팅 옵션

1. **Render** (현재 사용 중)

   - 무료 티어: 750시간/월
   - Go, Docker, PostgreSQL 지원
   - 현재 인프라와 동일

2. **Railway**

   - 무료 티어: $5 크레딧/월
   - 빠른 배포, 좋은 개발자 경험

3. **Fly.io**
   - 무료 티어: 3개 앱, 256MB RAM
   - 글로벌 CDN, 빠른 성능

### 권장: Render에서 Go 프로토타입

- 현재 인프라 활용
- 무료로 테스트 가능
- 성능 비교 용이
- 점진적 마이그레이션 가능

## 📅 일정 계획

### Phase 1: 프로토타입 (2-3주)

- Go 워크플로우 엔진 구현
- 기본 SSE 기능 구현
- Render에서 배포 및 테스트

### Phase 2: 성능 검증 (1주)

- 응답 시간 측정
- 메모리 사용량 비교
- 동시 처리 능력 테스트

### Phase 3: 점진적 전환 (3-4주)

- 워크플로우 엔진부터 Go로
- SSE 최적화
- API Gateway 설정

### Phase 4: 최적화 (2주)

- 성능 튜닝
- 모니터링 설정
- 문서화

## ⚠️ 리스크 및 고려사항

### 기술적 리스크

- **개발 시간**: 3-6주 (풀타임)
- **기존 기능 중단**: 가능성 있음
- **새로운 버그**: 도입 가능성

### 완화 방안

- **점진적 마이그레이션**: 한 번에 하나씩
- **A/B 테스트**: 성능 비교
- **롤백 계획**: 문제 시 즉시 복구

## 🎯 성공 지표

### 성능 지표

- **응답 시간**: 90% 감소 목표
- **메모리 사용량**: 70% 감소 목표
- **동시 연결 수**: 10배 증가 목표

### 비즈니스 지표

- **사용자 만족도**: 응답 속도 개선
- **운영 비용**: 호스팅 비용 절감
- **개발 생산성**: 더 빠른 배포

## 📝 다음 단계

1. **Go 프로토타입 개발 시작**
2. **Render에서 테스트 환경 구축**
3. **성능 벤치마크 도구 설정**
4. **팀 내 기술 검토 및 승인**

---

**작성일**: 2024년 12월
**상태**: 계획 단계
**우선순위**: 중간 (현재 시스템 안정화 후)
