-- Migration to add 'Cancelled' to sessions status
DO $$
BEGIN
  -- We must first drop the existing check constraint on status
  -- The constraint might be named sessions_status_check
  IF EXISTS (
      SELECT 1 
      FROM information_schema.table_constraints 
      WHERE constraint_name = 'sessions_status_check'
      AND table_name = 'sessions'
  ) THEN
      ALTER TABLE public.sessions DROP CONSTRAINT sessions_status_check;
  END IF;
END $$;

-- Re-add the check constraint with 'Cancelled' included
ALTER TABLE public.sessions 
    ADD CONSTRAINT sessions_status_check 
    CHECK (status IN ('Planned', 'Completed', 'Missed', 'Rescheduled', 'Cancelled'));
