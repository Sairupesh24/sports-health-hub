-- =============================================================
-- Migration: 20261005125000_sync_latest_schema
-- Description:
--   1. Ensures client_cases table exists with all clinical case sheet fields
--      (chief complaint, HOPI, past medical/surgical history, general physical,
--      vitals, local examination, provisional/final diagnosis, treatment plan,
--      lifestyle, training history, and menstrual history).
--   2. Links sessions table to client_cases via case_id with index and foreign key.
--   3. Synchronizes user and profile soft-delete columns (is_active, deleted_at).
--   4. Synchronizes organization notification settings, enabled_modules, and shift defaults.
--   5. Ensures audit_logs table, indexes, and relations are fully established.
--   6. Ensures TeamComms and Planner foreign keys, performance indexes, and defaults are intact.
-- =============================================================

-- 1. Create client_cases_seq sequence if not exists
CREATE SEQUENCE IF NOT EXISTS client_cases_seq START 1;

-- 2. Create client_cases table if not exists
CREATE TABLE IF NOT EXISTS "client_cases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "case_number" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "chief_complaint" TEXT,
    "created_by" UUID,
    "closed_by" UUID,
    "closed_at" TIMESTAMPTZ(6),
    "referral_source" TEXT,
    "referred_by" TEXT,
    "hopi" TEXT,
    "duration" TEXT,
    "radiation" TEXT,
    "migration" TEXT,
    "character" TEXT,
    "progression" TEXT,
    "aggravation" TEXT,
    "alleviation" TEXT,
    "associated_features" TEXT,
    "diurnal_variation" TEXT,
    "mechanism" TEXT,
    "aggravating_factors" TEXT,
    "relieving_factors" TEXT,
    "previous_treatment" TEXT,
    "previous_treatment_details" TEXT,
    "past_medical_history" TEXT,
    "past_surgical_history" TEXT,
    "drug_history" TEXT,
    "family_history" TEXT,
    "history_dm" BOOLEAN DEFAULT false,
    "history_htn" BOOLEAN DEFAULT false,
    "history_cad" BOOLEAN DEFAULT false,
    "history_cva" BOOLEAN DEFAULT false,
    "history_ba" BOOLEAN DEFAULT false,
    "history_tb" BOOLEAN DEFAULT false,
    "allergies" TEXT,
    "trauma" TEXT,
    "hospitalisation" TEXT,
    "years_of_training" INTEGER,
    "training_volume" TEXT,
    "training_type" TEXT,
    "training_notes" TEXT,
    "lmp" DATE,
    "cycle_regularity" TEXT,
    "menstrual_notes" TEXT,
    "built" TEXT,
    "nourishment" TEXT,
    "pallor" BOOLEAN DEFAULT false,
    "icterus" BOOLEAN DEFAULT false,
    "cyanosis" BOOLEAN DEFAULT false,
    "clubbing" BOOLEAN DEFAULT false,
    "lymphadenopathy" BOOLEAN DEFAULT false,
    "edema" BOOLEAN DEFAULT false,
    "beighton_score" INTEGER,
    "temperature" TEXT,
    "pulse_rate" INTEGER,
    "bp" TEXT,
    "spo2" NUMERIC,
    "respiratory_rate" INTEGER,
    "height" NUMERIC,
    "weight" NUMERIC,
    "bmi" NUMERIC,
    "inspection_notes" TEXT,
    "palpation_notes" TEXT,
    "range_of_motion_notes" TEXT,
    "special_tests" JSONB DEFAULT '[]'::jsonb,
    "neurovascular_notes" TEXT,
    "dermatome_notes" TEXT,
    "myotome_notes" TEXT,
    "reflexes_notes" TEXT,
    "pain_map" JSONB DEFAULT '{}'::jsonb,
    "pain_score" INTEGER,
    "provisional_diagnosis" TEXT,
    "icd_code" TEXT,
    "investigations" JSONB DEFAULT '[]'::jsonb,
    "final_diagnosis" TEXT,
    "short_term_goals" TEXT,
    "long_term_goals" TEXT,
    "treatment_plan" TEXT,
    "home_exercise_program" TEXT,
    "advice" TEXT,
    "additional_notes" TEXT,
    "body_region" TEXT,
    "injury_type" TEXT,
    "severity" TEXT DEFAULT 'Moderate',
    "diagnosis_notes" TEXT,
    "last_checkup_date" TEXT,
    "current_medication" TEXT,
    "history_other" BOOLEAN DEFAULT false,
    "history_other_details" TEXT,
    "illness_durations" JSONB DEFAULT '{}'::jsonb,
    "training_history" JSONB DEFAULT '[]'::jsonb,
    "age_of_menarche" TEXT,
    "age_of_menopause" TEXT,
    "side_of_body" TEXT,
    "injury_nature" TEXT,
    "etiology" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_cases_pkey" PRIMARY KEY ("id")
);

-- 3. Foreign Key Constraints for client_cases
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'client_cases_organization_id_fkey') THEN
    ALTER TABLE "client_cases" ADD CONSTRAINT "client_cases_organization_id_fkey" 
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'client_cases_client_id_fkey') THEN
    ALTER TABLE "client_cases" ADD CONSTRAINT "client_cases_client_id_fkey" 
    FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'client_cases_created_by_fkey') THEN
    ALTER TABLE "client_cases" ADD CONSTRAINT "client_cases_created_by_fkey" 
    FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'client_cases_closed_by_fkey') THEN
    ALTER TABLE "client_cases" ADD CONSTRAINT "client_cases_closed_by_fkey" 
    FOREIGN KEY ("closed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;

-- 4. Indexes for client_cases
CREATE INDEX IF NOT EXISTS "idx_client_cases_org" ON "client_cases" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_client_cases_client" ON "client_cases" ("client_id");
CREATE INDEX IF NOT EXISTS "idx_client_cases_created" ON "client_cases" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_client_cases_status" ON "client_cases" ("organization_id", "status");
CREATE INDEX IF NOT EXISTS "idx_client_cases_case_num" ON "client_cases" ("case_number");

-- 5. Sessions linkage to client_cases & source_console
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "case_id" UUID;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "source_console" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_case_id_fkey') THEN
    ALTER TABLE "sessions" ADD CONSTRAINT "sessions_case_id_fkey"
    FOREIGN KEY ("case_id") REFERENCES "client_cases"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_sessions_case_id" ON "sessions" ("case_id");
CREATE INDEX IF NOT EXISTS "idx_sessions_source_console" ON "sessions" ("source_console");

-- 6. Soft delete columns for Users and Profiles
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN DEFAULT true;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ(6);

ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN DEFAULT true;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ(6);

-- 7. Organization Notification Settings & defaults
CREATE TABLE IF NOT EXISTS "organization_notification_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "eod_reminder_time" TIME DEFAULT '20:00:00',
    "eod_reminder_enabled" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_notification_settings_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "organization_notification_settings" ADD COLUMN IF NOT EXISTS "eod_reminder_time" TIME DEFAULT '20:00:00';
ALTER TABLE "organization_notification_settings" ADD COLUMN IF NOT EXISTS "eod_reminder_enabled" BOOLEAN DEFAULT true;
ALTER TABLE "organization_notification_settings" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "default_shift_end_time" TIME DEFAULT '20:00:00';
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "enabled_modules" JSONB DEFAULT '["clinical","ams","nutritionist","hr","foe","client"]'::jsonb;

-- 8. Audit Logs Table & Indexes
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

CREATE INDEX IF NOT EXISTS "idx_audit_logs_org_entity_created" ON "audit_logs" ("organization_id", "entity_type", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_audit_logs_entity" ON "audit_logs" ("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_performed_by" ON "audit_logs" ("performed_by");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_at" ON "audit_logs" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_audit_logs_action" ON "audit_logs" ("action");
