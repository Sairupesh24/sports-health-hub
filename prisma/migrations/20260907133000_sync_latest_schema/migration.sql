-- =============================================================
-- Migration: 20260907133000_sync_latest_schema
-- Description: Synchronizes latest database schema updates including:
--              1. form_responses public_token and indexing
--              2. user_push_subscriptions timestamps and constraints
--              3. planner_dependencies required constraints
--              4. chat_messages descending created_at indexes
--              5. sessions lineage and reassignment tracking columns
--              6. profiles custom_specialist_settings and allowed_consoles
--              7. audit_logs and hr_leave_balances tables & constraints
-- =============================================================

-- 1. Form Responses: public_token for external public forms & assessments
ALTER TABLE "form_responses" ADD COLUMN IF NOT EXISTS "public_token" TEXT;
CREATE INDEX IF NOT EXISTS "idx_form_responses_public_token" ON "form_responses"("public_token");

-- 2. User Push Subscriptions: ensure timestamps default and not null
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_push_subscriptions') THEN
    UPDATE "user_push_subscriptions" SET "created_at" = CURRENT_TIMESTAMP WHERE "created_at" IS NULL;
    UPDATE "user_push_subscriptions" SET "updated_at" = CURRENT_TIMESTAMP WHERE "updated_at" IS NULL;
    ALTER TABLE "user_push_subscriptions" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE "user_push_subscriptions" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE "user_push_subscriptions" ALTER COLUMN "created_at" SET NOT NULL;
    ALTER TABLE "user_push_subscriptions" ALTER COLUMN "updated_at" SET NOT NULL;
  END IF;
END $$;

-- 3. Planner Dependencies: ensure predecessor_id and successor_id are not null
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'planner_dependencies') THEN
    DELETE FROM "planner_dependencies" WHERE "predecessor_id" IS NULL OR "successor_id" IS NULL;
    ALTER TABLE "planner_dependencies" ALTER COLUMN "predecessor_id" SET NOT NULL;
    ALTER TABLE "planner_dependencies" ALTER COLUMN "successor_id" SET NOT NULL;
  END IF;
END $$;

-- 4. Chat Messages: optimized indexes for channel and DM chronological fetching
CREATE INDEX IF NOT EXISTS "idx_chat_messages_channel" ON "chat_messages"("channel_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_chat_messages_dm" ON "chat_messages"("dm_thread_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_chat_messages_thread" ON "chat_messages"("parent_message_id");

-- 5. Sessions: lineage and reassignment tracking columns
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "rescheduled_from_id" UUID;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "rescheduled_from_session_id" UUID;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "rescheduled_to_session_id" UUID;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "reassigned_from_therapist_id" UUID;

-- 6. Profiles: custom specialist settings & allowed consoles
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "custom_specialist_settings" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "allowed_consoles" TEXT;

-- 7. Audit Logs Table
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "performed_by" UUID,
    "details" JSONB DEFAULT '{}'::jsonb,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_organization_id_fkey') THEN
    ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" 
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_performed_by_fkey') THEN
    ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_performed_by_fkey" 
    FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;

-- 8. HR Leave Balances Table
CREATE TABLE IF NOT EXISTS "hr_leave_balances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "casual_leave" INTEGER DEFAULT 12,
    "sick_leave" INTEGER DEFAULT 4,
    "paid_leave" INTEGER DEFAULT 0,
    "emergency_leave" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_leave_balances_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "unique_org_employee_leave_balance" 
ON "hr_leave_balances"("organization_id" ASC, "employee_id" ASC);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hr_leave_balances_organization_id_fkey') THEN
    ALTER TABLE "hr_leave_balances" ADD CONSTRAINT "hr_leave_balances_organization_id_fkey" 
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hr_leave_balances_employee_id_fkey') THEN
    ALTER TABLE "hr_leave_balances" ADD CONSTRAINT "hr_leave_balances_employee_id_fkey" 
    FOREIGN KEY ("employee_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;
