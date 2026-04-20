-- 1. Create scientist_resources table
CREATE TABLE IF NOT EXISTS public.scientist_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    athlete_id UUID REFERENCES public.clients(id) ON DELETE CASCADE, -- Optional link to athlete
    title TEXT NOT NULL,
    description TEXT,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('file', 'link')),
    category TEXT NOT NULL CHECK (category IN ('athlete_document', 'research', 'video', 'other')),
    url TEXT NOT NULL, -- Storage path for files, or full URL for links
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create strictly-enforced RLS policies
DROP POLICY IF EXISTS "Strict Sports Scientist View" ON public.scientist_resources;
DROP POLICY IF EXISTS "Strict Sports Scientist Insert" ON public.scientist_resources;
DROP POLICY IF EXISTS "Strict Sports Scientist Update" ON public.scientist_resources;
DROP POLICY IF EXISTS "Strict Sports Scientist Delete" ON public.scientist_resources;

-- NO ONE except Sports Scientists can see these (not even Admins, as requested)
CREATE POLICY "Strict Sports Scientist View" 
ON public.scientist_resources 
FOR SELECT 
TO authenticated 
USING (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND profession = 'Sports Scientist'
    )
);

CREATE POLICY "Strict Sports Scientist Insert" 
ON public.scientist_resources 
FOR INSERT 
TO authenticated 
WITH CHECK (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND profession = 'Sports Scientist'
    )
);

CREATE POLICY "Strict Sports Scientist Update" 
ON public.scientist_resources 
FOR UPDATE 
TO authenticated 
USING (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND profession = 'Sports Scientist'
    )
);

CREATE POLICY "Strict Sports Scientist Delete" 
ON public.scientist_resources 
FOR DELETE 
TO authenticated 
USING (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND profession = 'Sports Scientist'
    )
);

-- 4. Storage Setup
-- Note: Buckets are usually created via the Supabase UI or API, but we can add policies if they exist.
-- Assuming 'scientist-resources' bucket exists or will be created.

INSERT INTO storage.buckets (id, name, public) 
VALUES ('scientist-resources', 'scientist-resources', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
DROP POLICY IF EXISTS "Scientists can upload to scientist-resources" ON storage.objects;
DROP POLICY IF EXISTS "Scientists can view scientist-resources" ON storage.objects;
DROP POLICY IF EXISTS "Scientists can delete from scientist-resources" ON storage.objects;
DROP POLICY IF EXISTS "Scientist Resources Upload Access" ON storage.objects;
DROP POLICY IF EXISTS "Scientist Resources View Access" ON storage.objects;

CREATE POLICY "Scientist Resources Upload Access" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (
    bucket_id = 'scientist-resources' 
    AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND profession = 'Sports Scientist'
    )
);

CREATE POLICY "Scientists can view scientist-resources" 
ON storage.objects 
FOR SELECT 
TO authenticated 
USING (
    bucket_id = 'scientist-resources' 
    AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND profession = 'Sports Scientist'
    )
);

CREATE POLICY "Scientists can delete from scientist-resources" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (
    bucket_id = 'scientist-resources' 
    AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND profession = 'Sports Scientist'
    )
);
