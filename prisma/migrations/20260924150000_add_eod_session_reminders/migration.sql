-- =============================================================
-- Migration: 20260924150000_add_eod_session_reminders
-- Description:
--   Adds daily session reconciliation reminders (End-of-Day / EOD)
--   configuration columns to organization_notification_settings:
--     1. enable_eod_session_reminder (BOOLEAN DEFAULT true)
--     2. eod_reminder_time (VARCHAR(10) DEFAULT '19:00')
--     3. eod_reminder_channels (JSONB DEFAULT '{"email": true, "teamcomms": true}')
--     4. eod_reminder_scope (JSONB DEFAULT '{"require_status_update": true, "require_notes": true}')
--     5. eod_reminder_roles (TEXT[] DEFAULT ARRAY['physiotherapist', 'consultant', 'sports_scientist', 'sports_physician', 'coach'])
--     6. eod_last_run_at (TIMESTAMPTZ(6))
-- =============================================================

-- AlterTable: Add Daily Session Reconciliation Reminders configuration to organization_notification_settings
ALTER TABLE "organization_notification_settings" 
ADD COLUMN IF NOT EXISTS "enable_eod_session_reminder" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "eod_reminder_time" VARCHAR(10) DEFAULT '19:00',
ADD COLUMN IF NOT EXISTS "eod_reminder_channels" JSONB DEFAULT '{"email": true, "teamcomms": true}',
ADD COLUMN IF NOT EXISTS "eod_reminder_scope" JSONB DEFAULT '{"require_status_update": true, "require_notes": true}',
ADD COLUMN IF NOT EXISTS "eod_reminder_roles" TEXT[] DEFAULT ARRAY['physiotherapist', 'consultant', 'sports_scientist', 'sports_physician', 'coach'],
ADD COLUMN IF NOT EXISTS "eod_last_run_at" TIMESTAMPTZ(6);
