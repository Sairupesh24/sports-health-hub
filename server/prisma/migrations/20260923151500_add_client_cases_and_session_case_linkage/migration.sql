-- =============================================================
-- Migration: 20260923151500_add_client_cases_and_session_case_linkage
-- Description:
--   1. Creates the client_cases table for tracking consultation episodes of care (Case Sheets).
--   2. Adds case_id to sessions table to link subsequent treatment/physiotherapy sessions to a case.
--   3. Creates client_cases_seq sequence for human-readable case numbering (e.g. CSSH-2026-0001).
--   4. Creates foreign keys and indexes for query performance and data integrity.
-- =============================================================

-- 1. Create client_cases_seq sequence if not exists
CREATE SEQUENCE IF NOT EXISTS client_cases_seq START 1;

-- 2. Create client_cases table
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
    "onset" TEXT,
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
    "spo2" DECIMAL(5,2),
    "respiratory_rate" INTEGER,
    "height" DECIMAL(6,2),
    "weight" DECIMAL(6,2),
    "bmi" DECIMAL(5,2),
    "inspection_notes" TEXT,
    "palpation_notes" TEXT,
    "range_of_motion_notes" TEXT,
    "special_tests" JSONB DEFAULT '[]',
    "neurovascular_notes" TEXT,
    "dermatome_notes" TEXT,
    "myotome_notes" TEXT,
    "reflexes_notes" TEXT,
    "pain_map" JSONB DEFAULT '{}',
    "pain_score" INTEGER,
    "body_region" TEXT,
    "injury_type" TEXT,
    "severity" TEXT DEFAULT 'Moderate',
    "diagnosis_notes" TEXT,
    "provisional_diagnosis" TEXT,
    "icd_code" TEXT,
    "investigations" JSONB DEFAULT '[]',
    "final_diagnosis" TEXT,
    "short_term_goals" TEXT,
    "long_term_goals" TEXT,
    "treatment_plan" TEXT,
    "home_exercise_program" TEXT,
    "advice" TEXT,
    "additional_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_cases_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "client_cases_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "client_cases_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "client_cases_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
    CONSTRAINT "client_cases_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION
);

-- 3. Add case_id column to sessions table
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "case_id" UUID;

-- 4. Foreign key constraint for sessions.case_id -> client_cases(id)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_case_id_fkey') THEN
    ALTER TABLE "sessions" ADD CONSTRAINT "sessions_case_id_fkey"
    FOREIGN KEY ("case_id") REFERENCES "client_cases"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;

-- 5. Indexes for query optimization
CREATE INDEX IF NOT EXISTS "idx_client_cases_org" ON "client_cases"("organization_id");
CREATE INDEX IF NOT EXISTS "idx_client_cases_client" ON "client_cases"("client_id");
CREATE INDEX IF NOT EXISTS "idx_client_cases_status" ON "client_cases"("status");
CREATE INDEX IF NOT EXISTS "idx_client_cases_case_number" ON "client_cases"("case_number");
CREATE INDEX IF NOT EXISTS "idx_sessions_case_id" ON "sessions"("case_id");
