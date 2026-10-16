-- =============================================================
-- Migration: 20261016140000_add_batches_and_workout_enhancements
-- Description:
--   1. Creates batches table for squad/cohort management.
--   2. Creates batch_members table linking batches with athletes.
--   3. Syncs existing client_groups and client_group_members into batches.
--   4. Adds each_side column to liftitems for unilateral exercise support.
--   5. Links program_assignments to batches with foreign key and indexes.
--   6. Adds updated_at column to program_assignments.
--   7. Ensures athlete_type column exists on clients.
-- =============================================================

-- 1. Create batches table
CREATE TABLE IF NOT EXISTS "batches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "organization_id" UUID,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- Foreign keys for batches
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'batches_organization_id_fkey'
    ) THEN
        ALTER TABLE "batches"
            ADD CONSTRAINT "batches_organization_id_fkey"
            FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'batches_created_by_fkey'
    ) THEN
        ALTER TABLE "batches"
            ADD CONSTRAINT "batches_created_by_fkey"
            FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_batches_organization_id" ON "batches"("organization_id");

-- 2. Create batch_members table
CREATE TABLE IF NOT EXISTS "batch_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "batch_id" UUID,
    "athlete_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "batch_members_pkey" PRIMARY KEY ("id")
);

-- Foreign keys & unique constraint for batch_members
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'batch_members_batch_id_fkey'
    ) THEN
        ALTER TABLE "batch_members"
            ADD CONSTRAINT "batch_members_batch_id_fkey"
            FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'batch_members_batch_id_athlete_id_key'
    ) THEN
        ALTER TABLE "batch_members"
            ADD CONSTRAINT "batch_members_batch_id_athlete_id_key"
            UNIQUE ("batch_id", "athlete_id");
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_batch_members_athlete_id" ON "batch_members"("athlete_id");

-- 3. Sync existing client_groups & members into batches if not already present
INSERT INTO "batches" ("id", "name", "organization_id", "created_by", "created_at", "updated_at")
SELECT "id", "name", "organization_id", "created_by", "created_at", CURRENT_TIMESTAMP
FROM "client_groups"
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "batch_members" ("batch_id", "athlete_id", "created_at")
SELECT "group_id", "client_id", "added_at"
FROM "client_group_members"
ON CONFLICT ("batch_id", "athlete_id") DO NOTHING;

-- 4. Extend liftitems with unilateral each_side column
ALTER TABLE "liftitems"
    ADD COLUMN IF NOT EXISTS "each_side" BOOLEAN DEFAULT false;

-- 5. Extend program_assignments with batch linkage and updated_at
ALTER TABLE "program_assignments"
    ADD COLUMN IF NOT EXISTS "batch_id" UUID,
    ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP;

-- Reconcile any orphan batch_id before adding foreign key constraint
UPDATE "program_assignments"
SET "batch_id" = NULL
WHERE "batch_id" IS NOT NULL
  AND "batch_id" NOT IN (SELECT "id" FROM "batches");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'program_assignments_batch_id_fkey'
    ) THEN
        ALTER TABLE "program_assignments"
            ADD CONSTRAINT "program_assignments_batch_id_fkey"
            FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_program_assignments_batch_id" ON "program_assignments"("batch_id");
CREATE INDEX IF NOT EXISTS "idx_program_assignments_athlete_id" ON "program_assignments"("athlete_id");

-- 6. Ensure athlete_type exists on clients
ALTER TABLE "clients"
    ADD COLUMN IF NOT EXISTS "athlete_type" TEXT;
