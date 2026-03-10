-- Migration: Add UHID to profiles for client linkage

-- 1. Add uhid column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS uhid TEXT;

-- 2. Add a foreign key constraint to ensure the UHID matches an existing client
-- (This step ensures referential integrity between the auth user and the clinic's client record)
-- The clients table has an existing unique constraint on uhid.
ALTER TABLE public.profiles 
  ADD CONSTRAINT fk_profiles_uhid 
  FOREIGN KEY (uhid) 
  REFERENCES public.clients(uhid) 
  ON DELETE SET NULL;

-- 3. Create an index on profiles.uhid for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_uhid ON public.profiles(uhid);
