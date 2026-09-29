-- Migration: 20260929130000_add_case_sheet_checkup_medication_history_other
-- Description:
--   1. Adds last_checkup_date and current_medication to client_cases (HOPI section).
--   2. Adds history_other, history_other_details, and illness_durations to client_cases (Past History section).

ALTER TABLE "client_cases" ADD COLUMN IF NOT EXISTS "last_checkup_date" TEXT;
ALTER TABLE "client_cases" ADD COLUMN IF NOT EXISTS "current_medication" TEXT;
ALTER TABLE "client_cases" ADD COLUMN IF NOT EXISTS "history_other" BOOLEAN DEFAULT false;
ALTER TABLE "client_cases" ADD COLUMN IF NOT EXISTS "history_other_details" TEXT;
ALTER TABLE "client_cases" ADD COLUMN IF NOT EXISTS "illness_durations" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE "client_cases" ADD COLUMN IF NOT EXISTS "training_history" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE "client_cases" ADD COLUMN IF NOT EXISTS "age_of_menarche" TEXT;
ALTER TABLE "client_cases" ADD COLUMN IF NOT EXISTS "age_of_menopause" TEXT;
ALTER TABLE "client_cases" ADD COLUMN IF NOT EXISTS "side_of_body" TEXT;
ALTER TABLE "client_cases" ADD COLUMN IF NOT EXISTS "injury_nature" TEXT;
ALTER TABLE "client_cases" ADD COLUMN IF NOT EXISTS "etiology" TEXT;
