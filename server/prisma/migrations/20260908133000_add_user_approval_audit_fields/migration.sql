-- =============================================================
-- Migration: 20260908133000_add_user_approval_audit_fields
-- Description: Adds approval tracking and audit columns to profiles:
--              1. approved_by UUID (references profiles.id)
--              2. approved_at TIMESTAMPTZ(6)
--              3. Foreign key constraint and index for fast joins
-- =============================================================

-- 1. Add approved_by and approved_at columns to profiles
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "approved_by" UUID;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMPTZ(6);

-- 2. Foreign Key Constraint for approved_by -> profiles(id)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_approved_by_fkey') THEN
    ALTER TABLE "profiles" ADD CONSTRAINT "profiles_approved_by_fkey"
    FOREIGN KEY ("approved_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;

-- 3. Index on approved_by for performance when filtering and joining approver profiles
CREATE INDEX IF NOT EXISTS "idx_profiles_approved_by" ON "profiles"("approved_by");
