-- Create client_groups table
CREATE TABLE IF NOT EXISTS public.client_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

-- Create client_group_members table
CREATE TABLE IF NOT EXISTS public.client_group_members (
    group_id UUID NOT NULL REFERENCES public.client_groups(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (group_id, client_id)
);

-- Set up RLS for client_groups
ALTER TABLE public.client_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view groups in their org" ON public.client_groups; CREATE POLICY "Users can view groups in their org"
ON public.client_groups FOR SELECT
USING (
    organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can insert groups in their org" ON public.client_groups;
CREATE POLICY "Users can insert groups in their org"
ON public.client_groups FOR INSERT
WITH CHECK (
    organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can update groups in their org" ON public.client_groups;
CREATE POLICY "Users can update groups in their org"
ON public.client_groups FOR UPDATE
USING (
    organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can delete groups in their org" ON public.client_groups;
CREATE POLICY "Users can delete groups in their org"
ON public.client_groups FOR DELETE
USING (
    organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
);

-- Set up RLS for client_group_members
ALTER TABLE public.client_group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view group members in their org" ON public.client_group_members;
CREATE POLICY "Users can view group members in their org"
ON public.client_group_members FOR SELECT
USING (
    group_id IN (
        SELECT id FROM public.client_groups 
        WHERE organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS "Users can insert group members in their org" ON public.client_group_members;
CREATE POLICY "Users can insert group members in their org"
ON public.client_group_members FOR INSERT
WITH CHECK (
    group_id IN (
        SELECT id FROM public.client_groups 
        WHERE organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS "Users can delete group members in their org" ON public.client_group_members;
CREATE POLICY "Users can delete group members in their org"
ON public.client_group_members FOR DELETE
USING (
    group_id IN (
        SELECT id FROM public.client_groups 
        WHERE organization_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    )
);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS set_updated_at_client_groups ON public.client_groups;
CREATE TRIGGER set_updated_at_client_groups
    BEFORE UPDATE ON public.client_groups
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
