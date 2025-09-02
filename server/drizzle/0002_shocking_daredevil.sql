CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid,
	"eventType" varchar(100) NOT NULL,
	"event_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "check_event_data_json" CHECK (jsonb_typeof(event_data) = 'object'::text),
	CONSTRAINT "check_metadata_json" CHECK (jsonb_typeof(metadata) = 'object'::text)
);
--> statement-breakpoint
CREATE TABLE "publish_deploys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"version" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"deployUrl" text,
	"environment" varchar(20) DEFAULT 'production' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deployed_at" timestamp with time zone,
	CONSTRAINT "check_metadata_json" CHECK (jsonb_typeof(metadata) = 'object'::text)
);
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."user_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publish_deploys" ADD CONSTRAINT "publish_deploys_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_events_user_id" ON "events" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_events_session_id" ON "events" USING btree ("session_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_events_event_type" ON "events" USING btree ("eventType" text_ops);--> statement-breakpoint
CREATE INDEX "idx_events_timestamp" ON "events" USING btree ("timestamp" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_publish_deploys_project_id" ON "publish_deploys" USING btree ("project_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_publish_deploys_status" ON "publish_deploys" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_publish_deploys_created_at" ON "publish_deploys" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_publish_deploys_version" ON "publish_deploys" USING btree ("version" text_ops);