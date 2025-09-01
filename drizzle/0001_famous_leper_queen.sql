ALTER TABLE "chat_messages" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "chat_session_summaries" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_sessions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD COLUMN "last_activity" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD COLUMN "status" varchar(50) DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_session_summaries" ADD COLUMN "last_msg_id" uuid;--> statement-breakpoint
ALTER TABLE "chat_session_summaries" ADD COLUMN "token_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_session_summaries" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "chat_session_summaries" ADD CONSTRAINT "chat_session_summaries_last_msg_id_fkey" FOREIGN KEY ("last_msg_id") REFERENCES "public"."chat_messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_user_sessions_last_activity" ON "user_sessions" USING btree ("last_activity" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_user_sessions_status" ON "user_sessions" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_chat_session_summaries_last_msg" ON "chat_session_summaries" USING btree ("last_msg_id" uuid_ops);