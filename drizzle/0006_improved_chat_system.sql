-- Improved Chat System Migration
-- Based on design agreement for better separation of concerns

-- 1. Drop old user_sessions table if exists
DROP TABLE IF EXISTS "user_sessions" CASCADE;

-- 2. Create improved user_sessions table (control plane)
CREATE TABLE "user_sessions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "session_id" varchar(255) NOT NULL UNIQUE,
    "user_id" uuid NOT NULL,
    "title" varchar(255),
    "current_project_id" uuid,
    "current_component_id" uuid,
    "status" varchar(50) NOT NULL DEFAULT 'active',
    "expires_at" timestamp with time zone,
    "version" integer NOT NULL DEFAULT 1,
    "last_action" jsonb DEFAULT '{}',
    "context_data" jsonb NOT NULL DEFAULT '{}',
    "last_activity" timestamp with time zone NOT NULL DEFAULT now(),
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- 3. Create chat_messages table (data plane)
CREATE TABLE "chat_messages" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "session_id" varchar(255) NOT NULL,
    "role" varchar(50) NOT NULL,
    "content" jsonb NOT NULL,
    "model" varchar(100),
    "tokens" integer,
    "metadata" jsonb DEFAULT '{}',
    "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- 4. Create chat_session_summaries table (performance optimization)
CREATE TABLE "chat_session_summaries" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "session_id" varchar(255) NOT NULL UNIQUE,
    "summary" text NOT NULL,
    "last_msg_id" uuid,
    "token_count" integer,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- 5. Add foreign key constraints
ALTER TABLE "user_sessions"
ADD CONSTRAINT "user_sessions_user_id_users_id_fk"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;

ALTER TABLE "user_sessions"
ADD CONSTRAINT "user_sessions_current_project_id_projects_id_fk"
FOREIGN KEY ("current_project_id") REFERENCES "projects"("id") ON DELETE set null;

ALTER TABLE "user_sessions"
ADD CONSTRAINT "user_sessions_current_component_id_component_definitions_id_fk"
FOREIGN KEY ("current_component_id") REFERENCES "component_definitions"("id") ON DELETE set null;

ALTER TABLE "chat_messages"
ADD CONSTRAINT "chat_messages_session_id_user_sessions_session_id_fk"
FOREIGN KEY ("session_id") REFERENCES "user_sessions"("session_id") ON DELETE cascade;

ALTER TABLE "chat_session_summaries"
ADD CONSTRAINT "chat_session_summaries_session_id_user_sessions_session_id_fk"
FOREIGN KEY ("session_id") REFERENCES "user_sessions"("session_id") ON DELETE cascade;

ALTER TABLE "chat_session_summaries"
ADD CONSTRAINT "chat_session_summaries_last_msg_id_chat_messages_id_fk"
FOREIGN KEY ("last_msg_id") REFERENCES "chat_messages"("id") ON DELETE set null;

-- 6. Add indexes for performance
CREATE INDEX "idx_user_sessions_session" ON "user_sessions" ("session_id");
CREATE INDEX "idx_user_sessions_user" ON "user_sessions" ("user_id");
CREATE INDEX "idx_user_sessions_activity" ON "user_sessions" ("last_activity");
CREATE INDEX "idx_user_sessions_active" ON "user_sessions" ("status") WHERE "status" = 'active';

CREATE INDEX "idx_chat_messages_session_time" ON "chat_messages" ("session_id", "created_at" DESC);
CREATE INDEX "idx_chat_messages_role" ON "chat_messages" ("role");

CREATE INDEX "idx_chat_session_summaries_session" ON "chat_session_summaries" ("session_id");

-- 7. Add JSON stability check constraints
ALTER TABLE "user_sessions"
ADD CONSTRAINT "user_sessions_last_action_check"
CHECK (jsonb_typeof(last_action) = 'object');

ALTER TABLE "user_sessions"
ADD CONSTRAINT "user_sessions_context_data_check"
CHECK (jsonb_typeof(context_data) = 'object');

ALTER TABLE "chat_messages"
ADD CONSTRAINT "chat_messages_content_check"
CHECK (jsonb_typeof(content) = 'object');

ALTER TABLE "chat_messages"
ADD CONSTRAINT "chat_messages_metadata_check"
CHECK (jsonb_typeof(metadata) = 'object');

-- 8. Add RLS (Row Level Security) policies
ALTER TABLE "user_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chat_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chat_session_summaries" ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_sessions
CREATE POLICY "user_sessions_user_policy" ON "user_sessions"
    FOR ALL USING (user_id = auth.uid());

-- RLS policies for chat_messages
CREATE POLICY "chat_messages_user_policy" ON "chat_messages"
    FOR ALL USING (
        session_id IN (
            SELECT session_id FROM user_sessions WHERE user_id = auth.uid()
        )
    );

-- RLS policies for chat_session_summaries
CREATE POLICY "chat_session_summaries_user_policy" ON "chat_session_summaries"
    FOR ALL USING (
        session_id IN (
            SELECT session_id FROM user_sessions WHERE user_id = auth.uid()
        )
    );
