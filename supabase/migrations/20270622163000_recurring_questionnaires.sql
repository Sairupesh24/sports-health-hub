-- 1. Recurring Questionnaires Table
CREATE TABLE IF NOT EXISTS public.recurring_questionnaires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    questionnaire_id UUID NOT NULL REFERENCES public.questionnaires(id) ON DELETE CASCADE,
    specialist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    client_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
    recurrence_type TEXT NOT NULL CHECK (recurrence_type IN ('daily', 'weekly', 'biweekly', 'monthly')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
    next_run TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_run TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.recurring_questionnaires ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policy
CREATE POLICY "Org access for recurring_questionnaires" ON public.recurring_questionnaires 
FOR ALL USING (organization_id = public.get_my_org_id());
