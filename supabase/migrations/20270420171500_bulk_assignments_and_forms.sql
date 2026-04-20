-- ISHPO Bulk Assignment Engine Schema
-- Extends the existing questionnaire system to support mass distribution and tracking.

-- 1. Bulk Assignments Table
-- Tracks a mass distribution event
CREATE TABLE IF NOT EXISTS public.bulk_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    questionnaire_id UUID NOT NULL REFERENCES public.questionnaires(id) ON DELETE CASCADE,
    specialist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    total_clients INTEGER NOT NULL DEFAULT 0,
    responded_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Form Responses Table
-- Individual response records assigned to clients
CREATE TABLE IF NOT EXISTS public.form_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    form_id UUID NOT NULL REFERENCES public.questionnaires(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    specialist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    bulk_assignment_id UUID REFERENCES public.bulk_assignments(id) ON DELETE CASCADE,
    answers JSONB DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'reviewed')),
    clinical_interpretation TEXT,
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. RLS Policies
ALTER TABLE public.bulk_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;

-- Org access for bulk_assignments
CREATE POLICY "Org access for bulk_assignments" ON public.bulk_assignments 
FOR ALL USING (org_id = public.get_my_org_id());

-- Org access for form_responses
CREATE POLICY "Org access for form_responses" ON public.form_responses 
FOR ALL USING (org_id = public.get_my_org_id());

-- 4. Trigger to update responded_count on bulk_assignments
CREATE OR REPLACE FUNCTION public.update_bulk_assignment_progress()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.status = 'completed' AND OLD.status = 'pending') THEN
        UPDATE public.bulk_assignments 
        SET responded_count = responded_count + 1
        WHERE id = NEW.bulk_assignment_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_form_response_completion
AFTER UPDATE ON public.form_responses
FOR EACH ROW
WHEN (NEW.status = 'completed' AND OLD.status = 'pending')
EXECUTE FUNCTION public.update_bulk_assignment_progress();
