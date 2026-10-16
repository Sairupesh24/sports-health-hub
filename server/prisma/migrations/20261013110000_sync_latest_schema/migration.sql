-- =============================================================
-- Migration: 20261013110000_sync_latest_schema
-- Description:
--   1. Ensures sessions table has actual_start, actual_end, and source_console columns.
--   2. Updates sessions_status_check constraint to include all active and terminal statuses:
--      'Planned', 'Completed', 'Missed', 'Rescheduled', 'Cancelled', 'Checked In',
--      'Waitlisted', 'Reassigned', 'IN_PROGRESS', 'In Progress', 'SCHEDULED', 'Deleted', 'DELETED'.
--   3. Adds performance indexes on sessions (source_console, scheduled_start, case_id).
--   4. Ensures waitlist table and indexes exist for patient queuing.
--   5. Ensures performance_protocols and performance_assessments diagnostic structures are intact.
--   6. Reconciles any erroneously waitlisted sports science / athlete management sessions back to 'Planned'.
-- =============================================================

-- 1. Ensure columns exist on sessions
ALTER TABLE "sessions"
    ADD COLUMN IF NOT EXISTS "actual_start" TIMESTAMPTZ(6),
    ADD COLUMN IF NOT EXISTS "actual_end" TIMESTAMPTZ(6),
    ADD COLUMN IF NOT EXISTS "source_console" TEXT,
    ADD COLUMN IF NOT EXISTS "case_id" UUID,
    ADD COLUMN IF NOT EXISTS "rescheduled_from_session_id" UUID,
    ADD COLUMN IF NOT EXISTS "rescheduled_to_session_id" UUID,
    ADD COLUMN IF NOT EXISTS "is_unentitled" BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS "preference_type" TEXT DEFAULT 'Strict',
    ADD COLUMN IF NOT EXISTS "is_flexible_routing" BOOLEAN DEFAULT false;

-- 2. Update status constraint on sessions table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'sessions_status_check' 
          AND conrelid = 'sessions'::regclass
    ) THEN
        ALTER TABLE "sessions" DROP CONSTRAINT "sessions_status_check";
    END IF;

    ALTER TABLE "sessions" ADD CONSTRAINT "sessions_status_check" 
        CHECK (status = ANY (ARRAY[
            'Planned'::text, 
            'Completed'::text, 
            'Missed'::text, 
            'Rescheduled'::text, 
            'Cancelled'::text, 
            'Checked In'::text, 
            'Waitlisted'::text, 
            'Reassigned'::text, 
            'IN_PROGRESS'::text, 
            'In Progress'::text, 
            'SCHEDULED'::text, 
            'Deleted'::text, 
            'DELETED'::text
        ]));
END $$;

-- 3. Create performance indexes on sessions table
CREATE INDEX IF NOT EXISTS "idx_sessions_source_console" ON "sessions"("source_console");
CREATE INDEX IF NOT EXISTS "idx_sessions_case_id" ON "sessions"("case_id");
CREATE INDEX IF NOT EXISTS "idx_sessions_scheduled_start" ON "sessions"("scheduled_start");
CREATE INDEX IF NOT EXISTS "idx_sessions_therapist_scientist" ON "sessions"("therapist_id", "scientist_id");

-- 4. Ensure waitlist table exists
CREATE TABLE IF NOT EXISTS "waitlist" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "therapist_id" UUID,
    "service_id" UUID,
    "preferred_date" TIMESTAMPTZ(6),
    "preferred_time_slot" TEXT,
    "preference_type" TEXT DEFAULT 'Flexible',
    "status" TEXT NOT NULL DEFAULT 'Waiting',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waitlist_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "waitlist_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
    CONSTRAINT "waitlist_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE,
    CONSTRAINT "waitlist_therapist_id_fkey" FOREIGN KEY ("therapist_id") REFERENCES "profiles"("id") ON DELETE SET NULL,
    CONSTRAINT "waitlist_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "idx_waitlist_org_status" ON "waitlist"("organization_id", "status");
CREATE INDEX IF NOT EXISTS "idx_waitlist_client" ON "waitlist"("client_id");

-- 5. Ensure performance_protocols table exists
CREATE TABLE IF NOT EXISTS "performance_protocols" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID,
    "sport_name" TEXT NOT NULL,
    "template_name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sections_config" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performance_protocols_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "performance_protocols_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_performance_protocols_slug" ON "performance_protocols"("slug");
CREATE INDEX IF NOT EXISTS "idx_perf_protocols_slug" ON "performance_protocols"("slug");

-- 6. Reconcile sports science sessions mistakenly marked as Waitlisted
UPDATE "sessions"
SET "status" = 'Planned', "updated_at" = CURRENT_TIMESTAMP
WHERE "status" = 'Waitlisted'
  AND (
      "source_console" = 'sports_science' 
      OR LOWER("service_type") IN ('training', 'testing', 's&c', 'performance', 'strength & conditioning', 'workout')
      OR "scientist_id" IS NOT NULL
  );
