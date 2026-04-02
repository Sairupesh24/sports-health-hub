-- Fix schema assignment
-- 1. Add to clients
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS assigned_consultant_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Drop the old trigger and table
DROP TRIGGER IF EXISTS trg_log_therapist_assignment ON public.profiles;
DROP FUNCTION IF EXISTS public.log_therapist_assignment_change();

DROP TABLE IF EXISTS public.client_assignment_history;

-- 3. Recreate history table pointing to clients
CREATE TABLE public.client_assignment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    previous_consultant_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    new_consultant_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    changed_by UUID REFERENCES auth.users(id),
    change_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.client_assignment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org client assignment history" ON public.client_assignment_history FOR SELECT USING (
    client_id IN (SELECT id FROM public.clients WHERE organization_id = public.get_my_org_id())
);

CREATE POLICY "Staff can insert client assignment history" ON public.client_assignment_history FOR INSERT WITH CHECK (
    client_id IN (SELECT id FROM public.clients WHERE organization_id = public.get_my_org_id())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'foe'))
);

-- Recreate Trigger for clients table
CREATE OR REPLACE FUNCTION public.log_client_therapist_assignment_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.assigned_consultant_id IS DISTINCT FROM NEW.assigned_consultant_id) THEN
        INSERT INTO public.client_assignment_history (
            client_id,
            previous_consultant_id,
            new_consultant_id,
            changed_by,
            change_reason
        ) VALUES (
            NEW.id,
            OLD.assigned_consultant_id,
            NEW.assigned_consultant_id,
            auth.uid(),
            'Assignment Updated via Application'
        );
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_client_therapist_assignment
AFTER UPDATE OF assigned_consultant_id ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.log_client_therapist_assignment_change();
