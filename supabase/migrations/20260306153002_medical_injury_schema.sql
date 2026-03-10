-- Migration for ISHPO Entitlement Engine & Integrated Clinical Schema (Part 3: Medical/Injury Mgt)

-- 5. Injuries
CREATE TABLE IF NOT EXISTS public.injuries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    injury_date DATE NOT NULL,
    injury_type TEXT NOT NULL,
    injury_region TEXT NOT NULL,
    injury_side TEXT CHECK (injury_side IN ('Left', 'Right', 'Bilateral', 'N/A')),
    mechanism_of_injury TEXT,
    diagnosis TEXT,
    severity TEXT CHECK (severity IN ('Mild', 'Moderate', 'Severe')),
    status TEXT NOT NULL DEFAULT 'Acute' CHECK (status IN ('Acute', 'Rehabilitation', 'Return_to_Play', 'Resolved', 'Chronic')),
    expected_return_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 6. Rehabilitation Progress
CREATE TABLE IF NOT EXISTS public.rehab_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    injury_id UUID NOT NULL REFERENCES public.injuries(id) ON DELETE CASCADE,
    session_id UUID, -- Reference to the physio session where this progress was noted (added in next migration)
    milestone TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Not Started', 'In Progress', 'Achieved', 'Failed')),
    notes TEXT,
    recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    recorded_by UUID REFERENCES auth.users(id)
);

-- 7. Return to Play (RTP)
CREATE TABLE IF NOT EXISTS public.return_to_play (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    injury_id UUID NOT NULL REFERENCES public.injuries(id) ON DELETE CASCADE,
    clearance_stage TEXT NOT NULL CHECK (clearance_stage IN (
        'Stage 1 Rehab', 
        'Stage 2 Strength', 
        'Stage 3 Controlled Practice', 
        'Stage 4 Full Training', 
        'Stage 5 Return to Competition'
    )),
    approval_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    approved_by UUID REFERENCES auth.users(id)
);

-- Index for medical lookups
CREATE INDEX idx_injuries_client ON public.injuries(client_id);
CREATE INDEX idx_rehab_progress_injury ON public.rehab_progress(injury_id);
CREATE INDEX idx_rtp_injury ON public.return_to_play(injury_id);

-- RLS Enablement
ALTER TABLE public.injuries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rehab_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_to_play ENABLE ROW LEVEL SECURITY;

-- Shared function public.get_my_org_id() exists
-- Medical Policies (Therapists, Admins)
CREATE POLICY "Users can view org medical records" ON public.injuries FOR SELECT USING (organization_id = public.get_my_org_id());
CREATE POLICY "Staff can manage org injuries" ON public.injuries FOR ALL USING (organization_id = public.get_my_org_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'consultant')));

CREATE POLICY "Users can view org rehab progress" ON public.rehab_progress FOR SELECT USING (organization_id = public.get_my_org_id());
CREATE POLICY "Staff can manage org rehab progress" ON public.rehab_progress FOR ALL USING (organization_id = public.get_my_org_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'consultant')));

CREATE POLICY "Users can view org return to play" ON public.return_to_play FOR SELECT USING (organization_id = public.get_my_org_id());
CREATE POLICY "Staff can manage org return to play" ON public.return_to_play FOR ALL USING (organization_id = public.get_my_org_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'consultant')));
