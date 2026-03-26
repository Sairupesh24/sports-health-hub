-- Add team/department field to profiles for grouping (Gym Environments)
ALTER TABLE IF EXISTS public.profiles 
ADD COLUMN IF NOT EXISTS team TEXT;

-- Index for performance when filtering by team
CREATE INDEX IF NOT EXISTS idx_profiles_team ON public.profiles(team);

-- Optional: Create a view for easy reporting if needed later
-- CREATE OR REPLACE VIEW team_readiness AS ...
