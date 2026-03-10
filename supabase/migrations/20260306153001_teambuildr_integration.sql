-- Migration for ISHPO Entitlement Engine & Integrated Clinical Schema (Part 2: External AMS)

-- 3. Athlete External Identity Mapping (TeamBuildr)
CREATE TABLE IF NOT EXISTS public.athlete_external_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    external_system TEXT NOT NULL DEFAULT 'TeamBuildr',
    external_athlete_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, external_system),
    UNIQUE(organization_id, external_system, external_athlete_id) 
);

-- 4. External Training Summary (Read-Only Mirror from TeamBuildr)
CREATE TABLE IF NOT EXISTS public.external_training_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    external_system TEXT NOT NULL DEFAULT 'TeamBuildr',
    training_date DATE NOT NULL,
    workout_name TEXT,
    duration_minutes INTEGER,
    training_load NUMERIC,
    completion_status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(), -- When we synced it
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_ext_training_client_date ON public.external_training_summary(client_id, training_date DESC);
CREATE INDEX idx_athlete_ext_mapping_client ON public.athlete_external_mapping(client_id);

-- RLS Enablement
ALTER TABLE public.athlete_external_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_training_summary ENABLE ROW LEVEL SECURITY;

-- Shared function public.get_my_org_id() exists
-- Mapping Policies
CREATE POLICY "Users can view org athlete mappings" ON public.athlete_external_mapping FOR SELECT USING (organization_id = public.get_my_org_id());
CREATE POLICY "Staff can manage local athlete mappings" ON public.athlete_external_mapping FOR ALL USING (organization_id = public.get_my_org_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'consultant')));

-- Training Summary Policies (Read Only for Users, Insert/Update reserved for Service Role cron sync)
CREATE POLICY "Users can view org training summaries" ON public.external_training_summary FOR SELECT USING (organization_id = public.get_my_org_id());
-- Cron Edge function runs as Service Role (bypasses RLS), so we do NOT grant insert/update to users or therapists to enforce governance rule 1 & 4.
