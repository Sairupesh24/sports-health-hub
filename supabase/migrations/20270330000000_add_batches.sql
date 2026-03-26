-- Add Batches support to AMS

-- 1. Batches table
CREATE TABLE IF NOT EXISTS public.batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(org_id, name)
);

-- 2. Batch Members table
CREATE TABLE IF NOT EXISTS public.batch_members (
    batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
    athlete_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (batch_id, athlete_id)
);

-- 3. Modify program_assignments to support batch_id
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'program_assignments' AND COLUMN_NAME = 'batch_id') THEN
        ALTER TABLE public.program_assignments ADD COLUMN batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE;
    END IF;
    
    -- Make athlete_id nullable if batch_id is present (or keep it mandatory for individual assignments)
    -- Actually, for batch assignments, we might want to keep athlete_id NULL or handle it in the query.
    -- Let's make athlete_id nullable.
    ALTER TABLE public.program_assignments ALTER COLUMN athlete_id DROP NOT NULL;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assignment_target_check') THEN
        ALTER TABLE public.program_assignments ADD CONSTRAINT assignment_target_check CHECK (athlete_id IS NOT NULL OR batch_id IS NOT NULL);
    END IF;
END $$;

-- 4. RLS for Batches
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org access for batches" ON public.batches FOR ALL USING (org_id = public.get_my_org_id());
CREATE POLICY "Org access for batch_members" ON public.batch_members FOR ALL USING (batch_id IN (SELECT id FROM public.batches WHERE org_id = public.get_my_org_id()));

-- 5. RPC for batch members management (Convenience)
CREATE OR REPLACE FUNCTION public.update_batch_members(p_batch_id UUID, p_athlete_ids UUID[])
RETURNS VOID AS $$
BEGIN
    DELETE FROM public.batch_members WHERE batch_id = p_batch_id;
    INSERT INTO public.batch_members (batch_id, athlete_id)
    SELECT p_batch_id, unnest(p_athlete_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
