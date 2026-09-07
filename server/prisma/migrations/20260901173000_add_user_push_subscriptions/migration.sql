-- =============================================================
-- Migration: 20260901173000_add_user_push_subscriptions
-- Description: Adds user_push_subscriptions table and indexes
--              for Web Push notifications across desktop and mobile.
-- =============================================================

CREATE TABLE IF NOT EXISTS "user_push_subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_push_subscriptions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_push_subscriptions_user_id_endpoint_key" UNIQUE ("user_id", "endpoint"),
    CONSTRAINT "user_push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS "idx_push_subs_user" ON "user_push_subscriptions"("user_id");
