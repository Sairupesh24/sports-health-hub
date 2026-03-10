-- Quick fix: The client_id in all our new clinical tables was mistakenly forced to reference public.profiles(id) 
-- instead of public.clients(id), which is where the patient records actually exist.

DO $$
BEGIN
  -- Drop the constraint we mistakenly added or existed previously
  IF EXISTS (
      SELECT 1 
      FROM information_schema.table_constraints 
      WHERE constraint_name = 'injuries_client_id_fkey'
  ) THEN
      ALTER TABLE public.injuries DROP CONSTRAINT injuries_client_id_fkey;
  END IF;

  IF EXISTS (
      SELECT 1 
      FROM information_schema.table_constraints 
      WHERE constraint_name = 'sessions_client_id_fkey'
  ) THEN
      ALTER TABLE public.sessions DROP CONSTRAINT sessions_client_id_fkey;
  END IF;

  IF EXISTS (
      SELECT 1 
      FROM information_schema.table_constraints 
      WHERE constraint_name = 'external_training_summary_client_id_fkey'
  ) THEN
      ALTER TABLE public.external_training_summary DROP CONSTRAINT external_training_summary_client_id_fkey;
  END IF;
END $$;

-- Re-add them pointing explicitly to the clients table
ALTER TABLE public.injuries 
    ADD CONSTRAINT injuries_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

ALTER TABLE public.sessions 
    ADD CONSTRAINT sessions_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

ALTER TABLE public.external_training_summary 
    ADD CONSTRAINT external_training_summary_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;
