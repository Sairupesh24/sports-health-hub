-- Safely attempt to drop NOT NULL constraints from legacy columns on the injuries table
-- We wrap this in a DO block to ignore errors if the columns don't actually exist.

DO $$
BEGIN
  BEGIN
    ALTER TABLE public.injuries ALTER COLUMN injury_region DROP NOT NULL;
  EXCEPTION
    WHEN undefined_column THEN
      -- Do nothing if column doesn't exist
  END;

  BEGIN
    ALTER TABLE public.injuries ALTER COLUMN injury_severity DROP NOT NULL;
  EXCEPTION
    WHEN undefined_column THEN
      -- Do nothing if column doesn't exist
  END;
  
  BEGIN
    ALTER TABLE public.injuries ALTER COLUMN injury_type DROP NOT NULL;
  EXCEPTION
    WHEN undefined_column THEN
      -- Do nothing if column doesn't exist
  END;
END $$;
