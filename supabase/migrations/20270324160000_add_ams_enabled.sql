-- Create ams_enabled flag on clients to track clinical intent prior to ISHPO signup
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS ams_enabled BOOLEAN DEFAULT FALSE;
