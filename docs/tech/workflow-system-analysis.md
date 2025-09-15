# 워크플로우 시스템 분석 보고서

## 개요
현재 Navo 프로젝트의 워크플로우 시스템에서 발견된 문제점과 개선 방안을 분석한 보고서입니다.

## 분석 대상 데이터

### 워크플로우 실행 결과 예시
```json
{
  "plan": {
    "name": "우리 동네 강아지 산책 커뮤니티 웹사이트 구축",
    "steps": [
      {
        "id": "step1_create_db_record",
        "tool": "create_project_in_db",
        "title": "프로젝트 생성",
        "inputs": {
          "name": "Dog Walk Community",
          "userId": "733fbfae-6b3b-4ad9-9cce-8d5c562ba6cc",
          "description": "우리 동네 강아지 산책 커뮤니티 웹사이트",
          "organizationId": "fb8c0cfe-ebaa-4374-ba44-92b782f58581"
        },
        "description": "데이터베이스에 새 프로젝트를 등록합니다."
      },
      {
        "id": "step2_design_architecture",
        "tool": "create_project_architecture",
        "title": "애플리케이션 아키텍처 설계",
        "inputs": {
          "name": "Dog Walk Community",
          "type": "web-application",
          "description": "우리 동네 강아지 산책 커뮤니티 웹사이트. 기본적인 게시판 기능을 포함합니다."
        },
        "description": "기본적인 웹사이트 구조를 설계합니다."
      },
      {
        "id": "step3_create_vfs_directory",
        "tool": "create_vfs_directory",
        "title": "기본 디렉토리 생성",
        "inputs": {
          "path": "/dog-walk-community"
        },
        "description": "프로젝트를 위한 기본 디렉토리를 생성합니다."
      },
      {
        "id": "step4_create_index_file",
        "tool": "create_vfs_file",
        "title": "index.html 생성",
        "inputs": {
          "path": "/dog-walk-community/index.html",
          "content": "<html><body><h1>우리 동네 강아지 산책 커뮤니티</h1></body></html>"
        },
        "description": "기본적인 index.html 파일을 생성합니다."
      }
    ],
    "description": "강아지 산책 커뮤니티 웹사이트를 위한 기본적인 기능을 구현합니다."
  },
  "outputs": {
    "step1_create_db_record": {
      "id": "b49687e2-ce6a-4d5c-b061-6e7aefdd5a84",
      "name": "Dog Walk Community",
      "createdAt": "2025-09-15 13:13:03.584487+00",
      "updatedAt": "2025-09-15 13:13:03.584487+00",
      "description": "우리 동네 강아지 산책 커뮤니티 웹사이트",
      "requirements": null,
      "organizationId": "fb8c0cfe-ebaa-4374-ba44-92b782f58581"
    },
    "step4_create_index_file": {
      "path": "/dog-walk-community/index.html",
      "nodeId": "2328d7d5-df2e-4242-adb9-cf961edaaaf4",
      "success": true
    },
    "step2_design_architecture": {
      "project": {
        "name": "Dog Walk Community",
        "type": "web-application",
        "pages": [
          {
            "name": "Home",
            "path": "/",
            "description": "메인 페이지. 커뮤니티 소개 및 최신 게시글"
          },
          {
            "name": "Board",
            "path": "/board",
            "description": "강아지 산책 관련 게시판"
          },
          {
            "name": "Post",
            "path": "/board/:postId",
            "description": "게시글 상세 페이지"
          },
          {
            "name": "Profile",
            "path": "/profile",
            "description": "사용자 프로필 페이지"
          },
          {
            "name": "Login",
            "path": "/login",
            "description": "로그인 페이지"
          },
          {
            "name": "SignUp",
            "path": "/signup",
            "description": "회원가입 페이지"
          }
        ],
        "components": [
          {
            "name": "Navbar",
            "type": "layout",
            "props": [
              {
                "name": "isLoggedIn",
                "type": "boolean",
                "description": "로그인 여부"
              }
            ],
            "description": "네비게이션 바"
          },
          {
            "name": "PostList",
            "type": "ui",
            "props": [
              {
                "name": "posts",
                "type": "array",
                "description": "게시글 데이터 배열"
              }
            ],
            "description": "게시글 목록 표시"
          },
          {
            "name": "PostCard",
            "type": "ui",
            "props": [
              {
                "name": "post",
                "type": "object",
                "description": "게시글 데이터"
              }
            ],
            "description": "개별 게시글 카드"
          },
          {
            "name": "PostForm",
            "type": "form",
            "description": "게시글 작성 폼"
          },
          {
            "name": "CommentList",
            "type": "ui",
            "props": [
              {
                "name": "comments",
                "type": "array",
                "description": "댓글 데이터 배열"
              }
            ],
            "description": "댓글 목록 표시"
          }
        ],
        "description": "우리 동네 강아지 산책 커뮤니티 웹사이트. 기본적인 게시판 기능을 포함합니다.",
        "file_structure": {
          "name": "DogWalkCommunity",
          "type": "folder",
          "children": [
            {
              "name": "src",
              "type": "folder",
              "children": [
                {
                  "name": "components",
                  "type": "folder",
                  "children": []
                },
                {
                  "name": "pages",
                  "type": "folder",
                  "children": []
                }
              ]
            },
            {
              "name": "package.json",
              "type": "file",
              "content": "{\"name\": \"dog-walk-community\", \"version\": \"1.0.0\"}"
            },
            {
              "name": "README.md",
              "type": "file",
              "content": "# Dog Walk Community\n\n우리 동네 강아지 산책 커뮤니티 웹사이트입니다."
            }
          ]
        }
      }
    },
    "step3_create_vfs_directory": {
      "path": "/dog-walk-community",
      "nodeId": "2eae9d94-2d01-4623-9ea4-d16789daaccf",
      "success": true
    }
  },
  "summaryMessage": "프로젝트 생성이 완료되었습니다. 파일 트리와 미리보기를 확인해주세요."
}
```

## 발견된 문제점

### 1. 워크플로우 결과가 DB에 저장되지 않음

**문제:**
- 워크플로우 실행 결과(`plan`, `outputs`)가 메모리에만 존재
- `WorkflowExecutor`는 실행 결과를 `Map<string, any>`로만 반환하고 DB 저장 로직이 없음
- `OrchestratorService`에서도 결과를 그대로 반환만 하고 저장하지 않음

**영향:**
- 워크플로우 실행 히스토리 추적 불가
- 실행 결과 재활용 불가
- 디버깅 및 문제 분석 어려움

### 2. chat_message에 불필요한 데이터 저장

**문제:**
- 워크플로우 결과가 `chat_message` 테이블의 `payload`에 저장됨
- 이는 채팅 메시지가 아닌 워크플로우 실행 결과이므로 부적절한 위치
- 채팅 히스토리와 워크플로우 실행 결과가 섞여서 관리됨

**현재 데이터 구조:**
```typescript
// 부적절한 구조: chat_message에 워크플로우 결과 저장
{
  "role": "assistant",
  "content": "프로젝트 생성이 완료되었습니다...",
  "payload": {
    "plan": { ... },      // 워크플로우 계획
    "outputs": { ... },   // 실행 결과
    "summaryMessage": "..."
  }
}
```

### 3. 워크플로우 데이터 재활용 불가

**문제:**
- 실행된 워크플로우 결과를 다시 참조하거나 재사용할 수 없음
- 워크플로우 히스토리나 실행 로그를 추적할 수 없음
- 프로젝트와 워크플로우 실행 간의 연결이 약함

### 4. 데이터 일관성 문제

**문제:**
- 워크플로우 실행 결과와 실제 생성된 프로젝트/파일 간의 연결이 약함
- 실행 중 오류 발생 시 복구 메커니즘 부족
- 워크플로우 상태 추적 부족

## 개선 방안

### 1. 워크플로우 전용 테이블 생성

```sql
-- 워크플로우 실행 기록 테이블
CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  user_id UUID REFERENCES users(id),
  plan JSONB NOT NULL,
  outputs JSONB,
  status VARCHAR(20) DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 워크플로우 단계별 실행 기록 테이블
CREATE TABLE workflow_step_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_execution_id UUID REFERENCES workflow_executions(id) ON DELETE CASCADE,
  step_id VARCHAR(255) NOT NULL,
  step_title VARCHAR(500),
  step_description TEXT,
  tool_name VARCHAR(255) NOT NULL,
  inputs JSONB,
  outputs JSONB,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  execution_order INTEGER NOT NULL
);

-- 인덱스 생성
CREATE INDEX idx_workflow_executions_project_id ON workflow_executions(project_id);
CREATE INDEX idx_workflow_executions_user_id ON workflow_executions(user_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX idx_workflow_step_executions_workflow_id ON workflow_step_executions(workflow_execution_id);
CREATE INDEX idx_workflow_step_executions_step_id ON workflow_step_executions(step_id);
```

### 2. 워크플로우 서비스 개선

**WorkflowService 개선사항:**
- 실행 결과를 DB에 저장하는 로직 추가
- 워크플로우 히스토리 조회 기능
- 실행 상태 추적 및 관리
- 오류 처리 및 복구 메커니즘

**WorkflowExecutor 개선사항:**
- 각 단계별 실행 결과를 DB에 저장
- 실행 상태 실시간 업데이트
- 오류 발생 시 롤백 메커니즘

### 3. 데이터 분리 및 정리

**채팅 메시지:**
- 사용자-AI 대화만 저장
- 워크플로우 관련 메시지는 참조만

**워크플로우 실행:**
- 별도 테이블에서 관리
- 프로젝트-워크플로우 연결 관계 명확화

### 4. API 엔드포인트 추가

```typescript
// 워크플로우 히스토리 조회
GET /api/projects/:projectId/workflows

// 특정 워크플로우 실행 상세 조회
GET /api/workflows/:workflowId

// 워크플로우 실행 상태 조회
GET /api/workflows/:workflowId/status

// 워크플로우 재실행
POST /api/workflows/:workflowId/rerun
```

## 구현 우선순위

### Phase 1: 기본 인프라 구축
1. 워크플로우 테이블 생성
2. WorkflowService에 DB 저장 로직 추가
3. 기본 CRUD API 구현

### Phase 2: 실행 추적 개선
1. 단계별 실행 상태 추적
2. 실시간 상태 업데이트
3. 오류 처리 및 로깅 개선

### Phase 3: 고급 기능
1. 워크플로우 재실행 기능
2. 워크플로우 템플릿 저장
3. 실행 히스토리 분석 및 통계

## 예상 효과

### 장점
- 워크플로우 실행 결과의 체계적 관리
- 디버깅 및 문제 분석 용이성 향상
- 워크플로우 재활용 및 재실행 가능
- 프로젝트-워크플로우 관계 명확화
- 사용자 경험 개선

### 고려사항
- 기존 데이터 마이그레이션 필요
- API 변경으로 인한 프론트엔드 수정 필요
- 성능 최적화 (대용량 JSON 데이터 처리)

## 결론

현재 워크플로우 시스템은 실행 결과를 적절히 저장하고 관리하지 못하는 구조적 문제를 가지고 있습니다. 위의 개선 방안을 통해 워크플로우 실행 결과를 체계적으로 관리하고, 사용자에게 더 나은 경험을 제공할 수 있을 것입니다.

---

**작성일:** 2025-01-15
**작성자:** AI Assistant
**검토 대상:** 개발팀 리뷰

---
<details>
<summary><strong>[2025-09-15] Gemini 리뷰 및 코멘트</strong></summary>

### 총평 (Overall Review)

**훌륭한 분석 보고서입니다.** 현재 워크플로우 시스템의 핵심적인 문제점을 정확하게 진단하고, 그에 대한 매우 구체적이고 실현 가능한 해결책을 제시하고 있습니다. 문제의 원인부터 영향, 그리고 단계적인 개선 방안까지 논리적으로 잘 구성되어 있어 이 보고서 자체를 개발 계획의 청사진으로 사용해도 될 만큼 완성도가 높습니다.

특히, 단순히 "DB에 저장하자"는 수준을 넘어, `workflow_executions`와 `workflow_step_executions`라는 두 개의 정규화된 테이블 스키마를 제안한 부분은 시스템의 확장성과 유지보수성을 깊이 고려한 훌륭한 설계입니다.

### 항목별 상세 리뷰 (Detailed Review)

#### 1. 문제점 분석 (Problem Analysis)

*   **정확성:** "워크플로우 결과가 DB에 저장되지 않음", "chat_message에 불필요한 데이터 저장" 등, 현재 시스템의 근본적인 문제들을 정확하게 짚어냈습니다. 이는 시스템의 확장성을 저해하고 데이터 관리를 복잡하게 만드는 가장 시급한 문제입니다.
*   **영향 분석:** 각 문제가 "히스토리 추적 불가", "디버깅 어려움" 등 어떤 실질적인 악영향을 미치는지 명확하게 기술하여 개선의 필요성을 잘 뒷받침하고 있습니다.

#### 2. 개선 방안 (Proposed Solutions)

*   **테이블 설계:** 제안된 `workflow_executions`와 `workflow_step_executions` 테이블 스키마는 매우 훌륭합니다.
    *   전체 워크플로우 실행과 각 단계별 실행을 분리하여 관리의 효율성을 높였습니다.
    *   `status`, `started_at`, `completed_at` 등의 컬럼을 포함하여 실행 상태와 시간을 정밀하게 추적할 수 있도록 설계되었습니다.
    *   `ON DELETE CASCADE` 옵션과 주요 컬럼에 대한 인덱스 생성까지 고려한 점은 실제 운영 환경을 염두에 둔 좋은 설계입니다.
*   **서비스/API 개선:**
    *   `WorkflowService`와 `WorkflowExecutor`의 역할을 명확히 구분하고 각각에 필요한 개선 사항을 구체적으로 제시한 점이 좋습니다.
    *   워크플로우 히스토리 조회, 상태 조회, 재실행 등 필요한 API 엔드포인트를 구체적으로 정의하여 프론트엔드와의 연동 지점까지 명확하게 보여줍니다.

#### 3. 구현 우선순위 (Implementation Priority)

*   **현실성:** "Phase 1: 기본 인프라 구축"부터 시작하여 "Phase 3: 고급 기능"으로 나아가는 단계별 접근 방식은 매우 현실적이고 합리적입니다. 가장 시급한 데이터 저장 문제부터 해결하고 점진적으로 기능을 확장해나가는 계획은 안정적인 개발을 가능하게 합니다.

#### 4. 예상 효과 및 고려사항 (Expected Effects & Considerations)

*   **균형 잡힌 시각:** 개선으로 인한 장점뿐만 아니라, "기존 데이터 마이그레이션", "프론트엔드 수정 필요"와 같은 현실적인 고려사항까지 함께 제시하여 균형 잡힌 시각을 보여줍니다.

### 추가 제안 및 질문 (Additional Suggestions & Questions)

1.  **`project_id`의 Null 허용 여부:** `workflow_executions` 테이블에서 `project_id`가 Nullable로 되어 있습니다. 이는 프로젝트 생성 자체를 워크플로우가 담당하는 경우(첫 단계에서 `project_id`가 생성되는 경우)를 고려한 설계로 보입니다. 이 경우, 워크플로우가 완료된 후에는 `project_id`가 반드시 채워지도록 하는 로직이 `WorkflowService`에 포함되어야 할 것 같습니다. 이 의도가 맞을까요?
2.  **입력 값 참조:** 현재 `plan`의 `steps`를 보면, 후속 단계가 이전 단계의 출력 값을 입력으로 사용하는 경우가 명시적으로 표현되어 있지 않습니다. (예: `step3`이 `step1`에서 생성된 `projectId`를 사용하는 경우). 이는 `WorkflowExecutor`가 실행 시점에 동적으로 값을 주입해주는 방식으로 구현될 것으로 예상됩니다. 이 부분을 명확히 하기 위해 `plan` 스키마에 `inputs: { "projectId": "${step1_create_db_record.outputs.id}" }` 와 같은 변수 참조 문법을 도입하는 것을 고려해볼 수 있습니다.
3.  **대용량 데이터 처리:** "고려사항"에서 언급된 대용량 JSON 데이터 처리를 위해, `outputs` 컬럼에 저장될 데이터의 크기를 제한하거나, 자주 조회되지 않는 큰 데이터(예: 파일 내용)는 별도의 스토리지(예: S3)에 저장하고 경로만 저장하는 방안도 장기적으로 고려해볼 수 있습니다.

### 최종 결론

**"매우 잘 작성된 분석 및 설계 문서입니다. 이 보고서의 내용을 기반으로 즉시 개발에 착수해도 무리가 없을 것입니다."**

추가 제안 사항들은 논의를 통해 더 발전시킬 수 있는 부분이며, 보고서의 핵심적인 방향성과 제안된 설계는 매우 훌륭합니다. 이 계획대로 진행하는 것을 적극 추천합니다.

</details>
