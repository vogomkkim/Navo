# DAG 트랜잭션 전략 - TODO

## 개요

DAG(Directed Acyclic Graph) 기반 멀티 에이전트 워크플로우에서 트랜잭션 범위를 어떻게 설정할지에 대한 이론적 분석 및 구현 계획

## 현재 상황

- **에러 발생**: 프로젝트 복구 중 중복 키 제약 조건 위반
- **트랜잭션 미사용**: 현재 코드에서 트랜잭션을 사용하지 않음
- **DAG 특성**: 에이전트들이 순차적/병렬적으로 실행되는 워크플로우

## 이론적 분석

### 1. 전체 워크플로우 트랜잭션 (Global Transaction)

#### 장점
- 데이터 일관성: 전체 프로세스가 성공하거나 모두 실패
- 사용자 경험: 부분 성공으로 인한 혼란 방지
- 복구 단순성: 실패 시 전체 롤백으로 깨끗한 상태

#### 단점
- 롤백 비용: 많은 작업이 완료된 후 실패 시 모든 작업 취소
- 성능: 전체 워크플로우 동안 트랜잭션 유지
- 동시성: 다른 사용자의 작업 블로킹 가능성

### 2. 에이전트 단위별 트랜잭션 (Agent-Level Transaction)

#### 장점
- 세밀한 제어: 각 에이전트의 성공/실패를 독립적으로 관리
- 부분 성공 허용: 일부 에이전트는 성공하고 일부만 실패 가능
- 성능: 짧은 트랜잭션으로 동시성 향상
- 복구 유연성: 실패한 에이전트만 재시도 가능

#### 단점
- 데이터 불일치: 일부 에이전트만 성공한 상태에서 데이터 정합성 문제
- 복잡성: 부분 성공 상태 관리 로직 필요
- 사용자 혼란: "일부만 완료됨" 상태 설명 필요

### 3. DAG 특성을 고려한 하이브리드 접근법

#### 의존성 기반 트랜잭션 그룹핑
```typescript
// 예시: 의존성이 있는 에이전트들을 그룹으로 묶기
const transactionGroups = [
  // 그룹 1: 프로젝트 생성 (독립적)
  ['ProjectArchitectAgent'],

  // 그룹 2: 코드 생성 (프로젝트에 의존)
  ['CodeGeneratorAgent', 'DevelopmentGuideAgent'],

  // 그룹 3: 배포 (모든 것에 의존)
  ['RollbackAgent', 'DeploySiteAgent']
];

// 각 그룹 내에서 트랜잭션 실행
for (const group of transactionGroups) {
  await db.transaction(async (tx) => {
    for (const agentName of group) {
      await executeAgent(agentName, tx);
    }
  });
}
```

## 권장 방향

**DAG 상황에서는 에이전트 단위별 트랜잭션이 이론적으로 더 적합**

- **전체 트랜잭션**: 단순하지만 DAG 특성에 맞지 않음
- **에이전트 단위**: 복잡하지만 DAG 워크플로우에 최적화
- **하이브리드**: 의존성 기반 그룹핑으로 최적의 균형점

## 구현 계획

### Phase 1: 현재 문제 해결
- [ ] 프로젝트 복구 로직에 기존 데이터 삭제 추가
- [ ] 에이전트 단위 트랜잭션 적용

### Phase 2: DAG 트랜잭션 전략 구현
- [ ] 에이전트 의존성 분석
- [ ] 트랜잭션 그룹핑 로직 구현
- [ ] 상태 관리 시스템 구축

### Phase 3: 고급 기능
- [ ] 부분 성공 상태 관리
- [ ] 실패한 에이전트 재시도 로직
- [ ] 사용자에게 진행 상황 명확히 표시

## 참고 자료

- [Drizzle ORM Transactions](https://orm.drizzle.team/docs/get-started-postgresql#transactions)
- [PostgreSQL Transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)
- [DAG Workflow Patterns](https://en.wikipedia.org/wiki/Workflow_pattern)

## 상태

**현재 상태**: TODO - 구현 필요
**우선순위**: 중간 (현재 에러 해결 후)
**예상 소요 시간**: 2-3일
**담당자**: TBD
