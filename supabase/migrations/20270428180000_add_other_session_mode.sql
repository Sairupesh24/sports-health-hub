-- Migration: Add 'Other' to session_mode in sessions table
-- This allows logging sessions that don't involve clients (e.g. internal work)

-- 1. Update the check constraint for session_mode
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_session_mode_check;
ALTER TABLE public.sessions ADD CONSTRAINT sessions_session_mode_check 
    CHECK (session_mode IN ('Individual', 'Group', 'Other'));

-- 2. Update session_facts table as well (if it has the constraint)
-- Note: session_facts table didn't have a check constraint in the original migration, but it's good practice to keep it consistent if we add one.
