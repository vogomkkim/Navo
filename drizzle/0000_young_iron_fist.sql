-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"version" integer DEFAULT 1,
	CONSTRAINT "check_session_data_json" CHECK (jsonb_typeof(session_data) = 'object'::text)
);
--> statement-breakpoint
ALTER TABLE "user_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"password" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_key" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "component_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(255) DEFAULT 'basic' NOT NULL,
	"props_schema" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"render_template" text NOT NULL,
	"css_styles" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "component_definitions_project_id_name_key" UNIQUE("project_id","name")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"requirements" text
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"path" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"layout_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pages_project_id_path_key" UNIQUE("project_id","path")
);
--> statement-breakpoint
CREATE TABLE "components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" uuid NOT NULL,
	"component_definition_id" uuid NOT NULL,
	"props" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"message_type" text NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"version" integer DEFAULT 1,
	CONSTRAINT "chat_messages_message_type_check" CHECK (message_type = ANY (ARRAY['user'::text, 'assistant'::text])),
	CONSTRAINT "check_metadata_json" CHECK (jsonb_typeof(metadata) = 'object'::text)
);
--> statement-breakpoint
ALTER TABLE "chat_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "chat_session_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"summary" text NOT NULL,
	"key_points" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"version" integer DEFAULT 1,
	CONSTRAINT "check_key_points_json" CHECK (jsonb_typeof(key_points) = 'array'::text)
);
--> statement-breakpoint
ALTER TABLE "chat_session_summaries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "component_definitions" ADD CONSTRAINT "component_definitions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "components" ADD CONSTRAINT "components_component_definition_id_fkey" FOREIGN KEY ("component_definition_id") REFERENCES "public"."component_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "components" ADD CONSTRAINT "components_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."user_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_session_summaries" ADD CONSTRAINT "chat_session_summaries_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."user_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_user_sessions_created_at" ON "user_sessions" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_user_sessions_user_id" ON "user_sessions" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_component_definitions_project" ON "component_definitions" USING btree ("project_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_projects_owner" ON "projects" USING btree ("owner_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_pages_project" ON "pages" USING btree ("project_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_components_definition" ON "components" USING btree ("component_definition_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_components_page_order" ON "components" USING btree ("page_id" int4_ops,"order_index" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_chat_messages_created_at" ON "chat_messages" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_chat_messages_session_id" ON "chat_messages" USING btree ("session_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_chat_session_summaries_session_id" ON "chat_session_summaries" USING btree ("session_id" uuid_ops);
*/