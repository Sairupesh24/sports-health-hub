-- Migration to make injury_master_data global
-- 1. Drop the NOT NULL constraint on organization_id
ALTER TABLE public.injury_master_data ALTER COLUMN organization_id DROP NOT NULL;

-- 2. Drop the existing unique constraint
ALTER TABLE public.injury_master_data DROP CONSTRAINT IF EXISTS injury_master_data_organization_id_region_injury_type_diagn_key;

-- 3. Add a new unique constraint that handles NULLs (Global entries)
-- We use a conditional index or Postgres 15+ "NULLS NOT DISTINCT"
-- For broad compatibility, we'll use a unique index for both cases
CREATE UNIQUE INDEX IF NOT EXISTS injury_master_data_global_unique_idx 
ON public.injury_master_data (region, injury_type, diagnosis) 
WHERE organization_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS injury_master_data_org_unique_idx 
ON public.injury_master_data (organization_id, region, injury_type, diagnosis) 
WHERE organization_id IS NOT NULL;

-- 4. Update RLS policies to allow all authenticated users to see global data
DROP POLICY IF EXISTS "Users can view injury master data for their organization" ON public.injury_master_data;

CREATE POLICY "Users can view global or organization-specific injury master data" 
ON public.injury_master_data
FOR SELECT
TO authenticated
USING (organization_id IS NULL OR organization_id = public.get_my_org_id());
