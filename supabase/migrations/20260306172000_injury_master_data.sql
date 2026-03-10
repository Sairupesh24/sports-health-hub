-- Create the centralized Injury Master Data table
CREATE TABLE IF NOT EXISTS public.injury_master_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    region TEXT NOT NULL,
    injury_type TEXT NOT NULL,
    diagnosis TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure we don't insert exact duplicates for an organization
    UNIQUE(organization_id, region, injury_type, diagnosis)
);

-- Enable RLS
ALTER TABLE public.injury_master_data ENABLE ROW LEVEL SECURITY;

-- Allow Super Admins full access (using the public.has_role() function as demonstrated elsewhere)
CREATE POLICY "Super Admins can manage injury master data" 
ON public.injury_master_data
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') = true);

-- Allow organization members to read
CREATE POLICY "Users can view injury master data for their organization" 
ON public.injury_master_data
FOR SELECT
TO authenticated
USING (organization_id = public.get_my_org_id());
