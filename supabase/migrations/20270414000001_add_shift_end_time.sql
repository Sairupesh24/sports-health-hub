-- Add default_shift_end_time to organizations
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS default_shift_end_time TIME DEFAULT '18:00:00';

-- Refresh the PostgREST cache
NOTIFY pgrst, 'reload schema';
