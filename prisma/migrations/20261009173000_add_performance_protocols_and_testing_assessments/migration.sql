-- =============================================================
-- Migration: 20261009173000_add_performance_protocols_and_testing_assessments
-- Description:
--   1. Creates performance_protocols table with sport battery configurations.
--   2. Extends performance_assessments table with comprehensive diagnostic fields:
--      needs_analysis, anthropometrics, fms_data, stability_data,
--      power_speed_data, agility_data, endurance_data, anaerobic_data,
--      aerobic_data, biomotor_ratings, corrective_plan, plan_of_action,
--      overall_impression, batch_or_squad, and assessment_date.
--   3. Adds foreign keys linking performance_assessments to performance_protocols,
--      assessor (users), and organization.
--   4. Creates high-performance indexing for athlete lookup, squad batches,
--      and timeline dates.
--   5. Adds eod_reminder_enabled column to organization_notification_settings.
--   6. Ensures client_cases created_at index and case number index conventions.
-- =============================================================

-- 1. Create performance_protocols table
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

-- Unique constraint & performance index on slug
CREATE UNIQUE INDEX IF NOT EXISTS "uq_performance_protocols_slug" ON "performance_protocols"("slug");
CREATE INDEX IF NOT EXISTS "idx_perf_protocols_slug" ON "performance_protocols"("slug");

-- 2. Extend performance_assessments table
ALTER TABLE "performance_assessments"
    ADD COLUMN IF NOT EXISTS "org_id" UUID,
    ADD COLUMN IF NOT EXISTS "assessor_id" UUID,
    ADD COLUMN IF NOT EXISTS "protocol_id" UUID,
    ADD COLUMN IF NOT EXISTS "assessment_date" DATE DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS "batch_or_squad" TEXT,
    ADD COLUMN IF NOT EXISTS "needs_analysis" JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS "anthropometrics" JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS "fms_data" JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS "stability_data" JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS "power_speed_data" JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS "agility_data" JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS "endurance_data" JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS "anaerobic_data" JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS "aerobic_data" JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS "biomotor_ratings" JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS "corrective_plan" TEXT,
    ADD COLUMN IF NOT EXISTS "plan_of_action" TEXT,
    ADD COLUMN IF NOT EXISTS "overall_impression" TEXT,
    ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'completed',
    ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP;

-- Make legacy required columns optional for unified sport diagnostic batteries
ALTER TABLE "performance_assessments" ALTER COLUMN "category" DROP NOT NULL;
ALTER TABLE "performance_assessments" ALTER COLUMN "test_name" DROP NOT NULL;
ALTER TABLE "performance_assessments" ALTER COLUMN "metrics" DROP NOT NULL;

-- 3. Add Foreign Keys to performance_assessments
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'performance_assessments_assessor_id_fkey'
    ) THEN
        ALTER TABLE "performance_assessments"
            ADD CONSTRAINT "performance_assessments_assessor_id_fkey"
            FOREIGN KEY ("assessor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'performance_assessments_org_id_fkey'
    ) THEN
        ALTER TABLE "performance_assessments"
            ADD CONSTRAINT "performance_assessments_org_id_fkey"
            FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'performance_assessments_protocol_id_fkey'
    ) THEN
        ALTER TABLE "performance_assessments"
            ADD CONSTRAINT "performance_assessments_protocol_id_fkey"
            FOREIGN KEY ("protocol_id") REFERENCES "performance_protocols"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    END IF;
END $$;

-- 4. Create Performance Assessment Indexes
CREATE INDEX IF NOT EXISTS "idx_perf_assessments_athlete" ON "performance_assessments"("athlete_id");
CREATE INDEX IF NOT EXISTS "idx_perf_assessments_batch" ON "performance_assessments"("batch_or_squad");
CREATE INDEX IF NOT EXISTS "idx_perf_assessments_date" ON "performance_assessments"("assessment_date" DESC);

-- 5. Extend organization_notification_settings
ALTER TABLE "organization_notification_settings"
    ADD COLUMN IF NOT EXISTS "eod_reminder_enabled" BOOLEAN DEFAULT true;

-- 6. Ensure client_cases index updates
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'idx_client_cases_case_number' AND n.nspname = 'public'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'idx_client_cases_case_num' AND n.nspname = 'public'
    ) THEN
        ALTER INDEX "idx_client_cases_case_number" RENAME TO "idx_client_cases_case_num";
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_client_cases_created" ON "client_cases"("created_at" DESC);
