-- =============================================================
-- Migration: 20261019123000_sync_latest_schema
-- Description:
--   1. Ensures athlete_id on program_assignments properly references clients(id)
--      with cascading delete and no action on update.
--   2. Ensures indexes on program_assignments (athlete_id, batch_id) exist.
--   3. Ensures athlete_type, profile_id, and primary_scientist_id exist on clients.
--   4. Adds performance indexes on clients (profile_id, athlete_type) for fast lookup.
--   5. Ensures each_side column exists on liftitems for unilateral workouts.
-- =============================================================

-- 1. Ensure columns exist on clients
ALTER TABLE "clients"
    ADD COLUMN IF NOT EXISTS "athlete_type" TEXT,
    ADD COLUMN IF NOT EXISTS "profile_id" UUID,
    ADD COLUMN IF NOT EXISTS "primary_scientist_id" UUID;

CREATE INDEX IF NOT EXISTS "idx_clients_profile_id" ON "clients"("profile_id");
CREATE INDEX IF NOT EXISTS "idx_clients_athlete_type" ON "clients"("athlete_type");

-- 2. Ensure each_side column exists on liftitems
ALTER TABLE "liftitems"
    ADD COLUMN IF NOT EXISTS "each_side" BOOLEAN DEFAULT false;

-- 3. Ensure program_assignments batch and updated_at columns exist
ALTER TABLE "program_assignments"
    ADD COLUMN IF NOT EXISTS "batch_id" UUID,
    ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP;

-- Reconcile any orphan athlete_id records before enforcing constraint
UPDATE "program_assignments"
SET "athlete_id" = NULL
WHERE "athlete_id" IS NOT NULL
  AND "athlete_id" NOT IN (SELECT "id" FROM "clients");

-- 4. Foreign key constraint: program_assignments.athlete_id -> clients(id)
DO $$
BEGIN
    -- Drop old obsolete foreign key if pointing to users
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'program_assignments_athlete_id_fkey'
          AND confrelid = 'users'::regclass
    ) THEN
        ALTER TABLE "program_assignments" DROP CONSTRAINT "program_assignments_athlete_id_fkey";
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'program_assignments_athlete_id_fkey'
    ) THEN
        ALTER TABLE "program_assignments"
            ADD CONSTRAINT "program_assignments_athlete_id_fkey"
            FOREIGN KEY ("athlete_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
END $$;

-- 5. Indexes on program_assignments
CREATE INDEX IF NOT EXISTS "idx_program_assignments_athlete_id" ON "program_assignments"("athlete_id");
CREATE INDEX IF NOT EXISTS "idx_program_assignments_batch_id" ON "program_assignments"("batch_id");
