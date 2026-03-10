-- Ensure the clinical_notes column exists on the injuries table
ALTER TABLE public.injuries ADD COLUMN IF NOT EXISTS clinical_notes TEXT;
