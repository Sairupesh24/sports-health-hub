-- Migration: Fix sessions table for Sports Scientist module compatibility
-- Issues fixed:
--   1. client_id FK was pointing to profiles(id), but Sports Scientist uses clients table IDs
--   2. client_id was NOT NULL, blocking group sessions with no single client
--   3. service_type was NOT NULL, never supplied by Sports Scientist bookings
--   4. 'Cancelled' was missing from the status CHECK constraint

-- 1. Fix client_id FK: drop old FK (which referenced profiles) and recreate pointing to clients
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_client_id_fkey;
ALTER TABLE public.sessions ALTER COLUMN client_id DROP NOT NULL;
ALTER TABLE public.sessions
    ADD CONSTRAINT sessions_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;

-- 2. Make service_type nullable — Sports Scientist sessions don't have a service_type
ALTER TABLE public.sessions ALTER COLUMN service_type DROP NOT NULL;

-- 3. Widen the status check constraint to include 'Cancelled'
--    (Original only had: Planned, Completed, Missed, Rescheduled)
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_status_check;
ALTER TABLE public.sessions ADD CONSTRAINT sessions_status_check
    CHECK (status IN ('Planned', 'Completed', 'Missed', 'Rescheduled', 'Cancelled'));

-- 4. Ensure scientist_id column and session_type_id column exist
--    (Added by 20270312154000_sports_scientist_module.sql, guarded here for safety)
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS scientist_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS session_type_id UUID REFERENCES public.session_types(id);
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS group_name TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS session_notes TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS session_mode TEXT DEFAULT 'Individual'
    CHECK (session_mode IN ('Individual', 'Group'));
