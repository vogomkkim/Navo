CREATE TABLE "integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"service_type" varchar(50) NOT NULL,
	"credentials" jsonb NOT NULL,
	"metadata" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unique_user_service" UNIQUE("user_id","service_type")
);
--> statement-breakpoint
DROP TABLE "vercel_integrations" CASCADE;--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_integrations_user_id" ON "integrations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_integrations_service_type" ON "integrations" USING btree ("service_type");