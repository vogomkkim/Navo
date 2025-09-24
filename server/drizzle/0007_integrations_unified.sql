-- Migration: Unified Integrations Table
-- Description: Replace vercel_integrations with unified integrations table
-- Date: 2025-09-24

-- Create new unified integrations table
CREATE TABLE IF NOT EXISTS "integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"service_type" varchar(50) NOT NULL,
	"credentials" jsonb NOT NULL,
	"metadata" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "integrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_integrations_user_id" ON "integrations" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_integrations_service_type" ON "integrations" USING btree ("service_type");

-- Create unique constraint (user can have only one integration per service)
CREATE UNIQUE INDEX IF NOT EXISTS "unique_user_service" ON "integrations" ("user_id", "service_type");

-- Migrate existing vercel_integrations data to new structure
INSERT INTO "integrations" (
    "user_id",
    "service_type",
    "credentials",
    "metadata",
    "is_active",
    "created_at",
    "updated_at"
)
SELECT
    "user_id",
    'vercel' as "service_type",
    jsonb_build_object(
        'access_token', "access_token",
        'refresh_token', "refresh_token",
        'team_id', "team_id"
    ) as "credentials",
    jsonb_build_object(
        'connected_at', "created_at"
    ) as "metadata",
    true as "is_active",
    "created_at",
    "updated_at"
FROM "vercel_integrations";

-- Drop old table after successful migration
DROP TABLE IF EXISTS "vercel_integrations";
