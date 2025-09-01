-- Add user_sessions table for ContextManager
CREATE TABLE "user_sessions" (
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

-- Add foreign key constraints
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_current_project_id_projects_id_fk" FOREIGN KEY ("current_project_id") REFERENCES "projects"("id") ON DELETE set null;
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_current_component_id_component_definitions_id_fk" FOREIGN KEY ("current_component_id") REFERENCES "component_definitions"("id") ON DELETE set null;

-- Add indexes for performance
CREATE INDEX "idx_user_sessions_session" ON "user_sessions" ("session_id");
CREATE INDEX "idx_user_sessions_user" ON "user_sessions" ("user_id");
CREATE INDEX "idx_user_sessions_activity" ON "user_sessions" ("last_activity");
