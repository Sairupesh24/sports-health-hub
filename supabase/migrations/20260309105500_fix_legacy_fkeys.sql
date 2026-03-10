-- Drop the old, likely broken, foreign key constraints that might have pointed to auth.users
DO $$
BEGIN
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
      WHERE constraint_name = 'injuries_organization_id_fkey'
  ) THEN
      ALTER TABLE public.injuries DROP CONSTRAINT injuries_organization_id_fkey;
  END IF;
END $$;

-- Add our explicitly correct constraints pointing to public.profiles and public.organizations
ALTER TABLE public.injuries 
    ADD CONSTRAINT injuries_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    ADD CONSTRAINT injuries_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
