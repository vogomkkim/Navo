CREATE TABLE "vercel_integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"team_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vercel_integrations_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "vercel_integrations" ADD CONSTRAINT "vercel_integrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_vercel_integrations_user_id" ON "vercel_integrations" USING btree ("user_id");