-- Create waitlist table
CREATE TABLE public.waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    therapist_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    preferred_date DATE NOT NULL,
    preferred_time_slot TIME NOT NULL,
    preference_type TEXT NOT NULL CHECK (preference_type IN ('Strict', 'Flexible')),
    status TEXT NOT NULL CHECK (status IN ('Waiting', 'Notified', 'Filled', 'Expired')) DEFAULT 'Waiting',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    notified_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    organization_code TEXT -- For quick lookup if needed
);

-- Add indexes for performance
CREATE INDEX idx_waitlist_org_id ON public.waitlist(organization_id);
CREATE INDEX idx_waitlist_client_id ON public.waitlist(client_id);
CREATE INDEX idx_waitlist_status ON public.waitlist(status) WHERE status = 'Waiting';
CREATE INDEX idx_waitlist_matching ON public.waitlist(preferred_date, preferred_time_slot, therapist_id);

-- Enable RLS
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage waitlist"
    ON public.waitlist FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Consultants can view waitlist for their shifts"
    ON public.waitlist FOR SELECT
    TO authenticated
    USING (
        public.has_role(auth.uid(), 'consultant') AND 
        (therapist_id = auth.uid() OR therapist_id IS NULL)
    );

-- Function to set expires_at when status changes to 'Notified'
CREATE OR REPLACE FUNCTION public.handle_waitlist_notification()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'Notified' AND (OLD.status IS NULL OR OLD.status != 'Notified') THEN
        NEW.notified_at = now();
        NEW.expires_at = now() + interval '15 minutes';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_waitlist_notification
    BEFORE UPDATE ON public.waitlist
    FOR EACH ROW EXECUTE FUNCTION public.handle_waitlist_notification();
