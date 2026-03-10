-- Add resolved_date to track exactly when an injury was fully cured/resolved
ALTER TABLE public.injuries ADD COLUMN IF NOT EXISTS resolved_date DATE;
