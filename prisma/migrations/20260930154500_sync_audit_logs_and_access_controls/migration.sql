-- =============================================================
-- Migration: 20260930154500_sync_audit_logs_and_access_controls
-- Description:
--   1. Ensures the audit_logs table exists with foreign key constraints to
--      organizations(id) and users(id).
--   2. Adds performance indexes to audit_logs for organization isolation,
--      entity lookups, actor tracking, and chronological ordering.
--   3. Sets default '[]' on profiles.allowed_consoles and backfills null values.
--   4. Ensures profile permission flags (has_calendar_access, has_analytics_access,
--      has_assign_work_access) have default false constraints.
-- =============================================================

-- 1. Ensure audit_logs table structure
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

-- 2. Foreign Key Constraints for audit_logs
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

-- 3. Optimized Indexes for Audit Trail Filtering & Timeline Queries
CREATE INDEX IF NOT EXISTS "idx_audit_logs_org_entity_created" ON "audit_logs" ("organization_id", "entity_type", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_audit_logs_entity" ON "audit_logs" ("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_performed_by" ON "audit_logs" ("performed_by");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_at" ON "audit_logs" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_audit_logs_action" ON "audit_logs" ("action");

-- 4. Set clean defaults and backfill for profiles access control columns
ALTER TABLE "profiles" ALTER COLUMN "allowed_consoles" SET DEFAULT '[]';
UPDATE "profiles" SET "allowed_consoles" = '[]' WHERE "allowed_consoles" IS NULL;

ALTER TABLE "profiles" ALTER COLUMN "has_calendar_access" SET DEFAULT false;
ALTER TABLE "profiles" ALTER COLUMN "has_analytics_access" SET DEFAULT false;
ALTER TABLE "profiles" ALTER COLUMN "has_assign_work_access" SET DEFAULT false;
