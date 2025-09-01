-- =====================================================
-- ContextManager를 위한 user_sessions 테이블 생성
-- =====================================================

-- 테이블 생성
CREATE TABLE IF NOT EXISTS "user_sessions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "session_id" varchar(255) NOT NULL UNIQUE,
    "user_id" uuid NOT NULL,
    "current_project_id" uuid,
    "current_component_id" uuid,
    "conversation_history" jsonb NOT NULL DEFAULT '[]',
    "last_action" jsonb DEFAULT '{}',
    "context_data" jsonb NOT NULL DEFAULT '{}',
    "is_active" boolean NOT NULL DEFAULT true,
    "last_activity" timestamp with time zone NOT NULL DEFAULT now(),
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- 외래 키 제약 조건 추가
ALTER TABLE "user_sessions"
ADD CONSTRAINT "user_sessions_user_id_users_id_fk"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;

ALTER TABLE "user_sessions"
ADD CONSTRAINT "user_sessions_current_project_id_projects_id_fk"
FOREIGN KEY ("current_project_id") REFERENCES "projects"("id") ON DELETE set null;

ALTER TABLE "user_sessions"
ADD CONSTRAINT "user_sessions_current_component_id_component_definitions_id_fk"
FOREIGN KEY ("current_component_id") REFERENCES "component_definitions"("id") ON DELETE set null;

-- 성능을 위한 인덱스 생성
CREATE INDEX "idx_user_sessions_session" ON "user_sessions" ("session_id");
CREATE INDEX "idx_user_sessions_user" ON "user_sessions" ("user_id");
CREATE INDEX "idx_user_sessions_activity" ON "user_sessions" ("last_activity");

-- =====================================================
-- 테이블 구조 설명
-- =====================================================

/*
user_sessions 테이블은 ContextManager의 핵심 데이터 저장소입니다.

주요 컬럼:
- session_id: 사용자별 고유 세션 식별자
- user_id: 사용자 참조 (users 테이블)
- current_project_id: 현재 작업 중인 프로젝트 (projects 테이블)
- current_component_id: 현재 작업 중인 컴포넌트 (component_definitions 테이블)
- conversation_history: 대화 히스토리 JSON 배열 (최근 50개 메시지)
- last_action: 마지막 수행한 액션 정보
- context_data: 추가 컨텍스트 데이터
- is_active: 세션 활성 상태
- last_activity: 마지막 활동 시간 (자동 정리용)
- created_at/updated_at: 생성/수정 시간

인덱스:
- session_id: 세션 조회 최적화
- user_id: 사용자별 세션 조회 최적화
- last_activity: 비활성 세션 정리 최적화
*/

-- =====================================================
-- 테이블 삭제 (롤백용)
-- =====================================================

-- 롤백이 필요한 경우 아래 쿼리 실행:
-- DROP TABLE IF EXISTS "user_sessions" CASCADE;
