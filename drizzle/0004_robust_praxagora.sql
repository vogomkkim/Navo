CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"message_type" text NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_session_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"summary" text NOT NULL,
	"key_points" jsonb DEFAULT '[]',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_data" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "drafts" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "drafts" CASCADE;--> statement-breakpoint
ALTER TABLE "component_definitions" DROP CONSTRAINT "component_definitions_name_unique";--> statement-breakpoint
DROP INDEX "idx_components_page_order";--> statement-breakpoint
ALTER TABLE "component_definitions" ALTER COLUMN "props_schema" SET DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "components" ALTER COLUMN "props" SET DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "data" SET DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "pages" ALTER COLUMN "layout_json" SET DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "suggestions" ALTER COLUMN "content" SET DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "component_definitions" ADD COLUMN "project_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "components" ADD COLUMN "component_definition_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "components" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "components" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "name" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "is_published" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "requirements" text;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_user_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."user_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_session_summaries" ADD CONSTRAINT "chat_session_summaries_session_id_user_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."user_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_chat_messages_session_time" ON "chat_messages" USING btree ("session_id","created_at" desc);--> statement-breakpoint
CREATE INDEX "idx_chat_messages_type" ON "chat_messages" USING btree ("message_type");--> statement-breakpoint
CREATE INDEX "idx_chat_session_summaries_session" ON "chat_session_summaries" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_user_sessions_user" ON "user_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_sessions_created_at" ON "user_sessions" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "component_definitions" ADD CONSTRAINT "component_definitions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "components" ADD CONSTRAINT "components_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "components" ADD CONSTRAINT "components_component_definition_id_component_definitions_id_fk" FOREIGN KEY ("component_definition_id") REFERENCES "public"."component_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_component_definitions_project" ON "component_definitions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_components_page" ON "components" USING btree ("page_id");--> statement-breakpoint
CREATE INDEX "idx_pages_project" ON "pages" USING btree ("project_id");--> statement-breakpoint
ALTER TABLE "components" DROP COLUMN "type";--> statement-breakpoint
ALTER TABLE "component_definitions" ADD CONSTRAINT "component_definitions_project_name_unique" UNIQUE("project_id","name");