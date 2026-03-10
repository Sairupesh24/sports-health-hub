-- Migration for ISHPO Entitlement Engine & Integrated Clinical Schema (Part 4: Unified Sessions)

-- 8. Unified Sessions (Replaces/Integrates Appointments for delivery)
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    therapist_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    service_type TEXT NOT NULL CHECK (service_type IN ('Physiotherapy', 'Strength & Conditioning', 'Active Recovery Training', 'Consultation')),
    entitlement_id UUID REFERENCES public.client_entitlements(id) ON DELETE SET NULL,
    
    session_mode TEXT DEFAULT 'Individual' CHECK (session_mode IN ('Individual', 'Group')),
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ NOT NULL,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    
    status TEXT NOT NULL DEFAULT 'Planned' CHECK (status IN ('Planned', 'Completed', 'Missed', 'Rescheduled')),
    
    rescheduled_from_session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
    rescheduled_to_session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 9. Physio Session Details (1:1 Extension of Sessions for Clinical Data)
CREATE TABLE IF NOT EXISTS public.physio_session_details (
    session_id UUID PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE,
    injury_id UUID REFERENCES public.injuries(id) ON DELETE SET NULL,
    pain_score INTEGER CHECK (pain_score BETWEEN 0 AND 10),
    modality_used TEXT,
    treatment_type TEXT,
    manual_therapy TEXT,
    exercise_given TEXT,
    range_of_motion TEXT,
    strength_progress TEXT,
    clinical_notes TEXT,
    next_plan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sessions_client ON public.sessions(client_id);
CREATE INDEX idx_sessions_therapist ON public.sessions(therapist_id);
CREATE INDEX idx_sessions_entitlement ON public.sessions(entitlement_id);

-- RLS Enablement
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.physio_session_details ENABLE ROW LEVEL SECURITY;

-- Governance Trigger 1: Hard Delete Prevention
CREATE OR REPLACE FUNCTION public.prevent_session_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Sessions cannot be hard deleted. Change the status to Cancelled or Rescheduled instead.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_no_session_delete
BEFORE DELETE ON public.sessions
FOR EACH ROW EXECUTE FUNCTION public.prevent_session_delete();

-- Governance Trigger 2: 30-Min Lock and Actual Start/End Validation
CREATE OR REPLACE FUNCTION public.enforce_session_governance()
RETURNS TRIGGER AS $$
BEGIN
    -- Prevent editing 'Planned' fields (scheduled_start, scheduled_end) less than 30 mins before start
    IF TG_OP = 'UPDATE' THEN
        IF OLD.scheduled_start != NEW.scheduled_start OR OLD.scheduled_end != NEW.scheduled_end THEN
            IF NOW() > (OLD.scheduled_start - interval '30 minutes') THEN
                RAISE EXCEPTION 'Cannot modify scheduled times within 30 minutes of the session start. Please mark as Rescheduled and create a new session.';
            END IF;
        END IF;
    END IF;

    -- Completion requires actual_start and actual_end
    IF NEW.status = 'Completed' THEN
        IF NEW.actual_start IS NULL OR NEW.actual_end IS NULL THEN
            RAISE EXCEPTION 'Cannot mark session as Completed without providing actual_start and actual_end timestamps.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER session_governance_check
BEFORE INSERT OR UPDATE ON public.sessions
FOR EACH ROW EXECUTE FUNCTION public.enforce_session_governance();

-- Shared function public.get_my_org_id() exists
-- Session Policies
CREATE POLICY "Users can view org sessions" ON public.sessions FOR SELECT USING (organization_id = public.get_my_org_id());
CREATE POLICY "Users can insert org sessions" ON public.sessions FOR INSERT WITH CHECK (organization_id = public.get_my_org_id());
CREATE POLICY "Users can update org sessions" ON public.sessions FOR UPDATE USING (organization_id = public.get_my_org_id());

CREATE POLICY "Users can view org physio details" ON public.physio_session_details FOR SELECT USING (
    session_id IN (SELECT id FROM public.sessions WHERE organization_id = public.get_my_org_id())
);
CREATE POLICY "Therapists can insert org physio details" ON public.physio_session_details FOR INSERT WITH CHECK (
    session_id IN (SELECT id FROM public.sessions WHERE organization_id = public.get_my_org_id()) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'consultant'))
);
CREATE POLICY "Therapists can update org physio details" ON public.physio_session_details FOR UPDATE USING (
    session_id IN (SELECT id FROM public.sessions WHERE organization_id = public.get_my_org_id()) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'consultant'))
);
