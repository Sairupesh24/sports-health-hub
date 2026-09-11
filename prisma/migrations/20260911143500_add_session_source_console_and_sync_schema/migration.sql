-- =============================================================
-- Migration: 20260911143500_add_session_source_console_and_sync_schema
-- Description:
--   1. Adds source_console to sessions table for tracking console origin
--      ('sports_science', 'clinical', 'ams', etc.)
--   2. Ensures session lineage columns exist:
--      - rescheduled_from_id (UUID)
--      - reassigned_from_therapist_id (UUID)
--      - rescheduled_from_session_id (UUID)
--      - rescheduled_to_session_id (UUID)
--   3. Ensures custom_specialist_settings JSONB column exists on profiles
--   4. Creates index on sessions(source_console) for query optimization
-- =============================================================

-- 1. Add source_console column to sessions
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "source_console" TEXT;

-- 2. Ensure session lineage & reassignment tracking columns exist on sessions
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "rescheduled_from_id" UUID;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "reassigned_from_therapist_id" UUID;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "rescheduled_from_session_id" UUID;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "rescheduled_to_session_id" UUID;

-- 3. Ensure custom_specialist_settings column exists on profiles
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "custom_specialist_settings" JSONB DEFAULT '{}'::jsonb;

-- 4. Create index on source_console for filtered lookups & category classification
CREATE INDEX IF NOT EXISTS "idx_sessions_source_console" ON "sessions"("source_console");
