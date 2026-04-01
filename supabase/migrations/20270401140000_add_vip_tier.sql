-- Add is_vip to clients table
ALTER TABLE public.clients ADD COLUMN is_vip BOOLEAN DEFAULT false;

-- Add is_vip to profiles table (for AMS modules and reporting)
ALTER TABLE public.profiles ADD COLUMN is_vip BOOLEAN DEFAULT false;

-- Create client_admin_notes for secure remarks and audit trail
CREATE TABLE public.client_admin_notes (
    client_id UUID PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
    remarks TEXT NOT NULL,
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_admin_notes ENABLE ROW LEVEL SECURITY;

-- Add index for VIP filtering
CREATE INDEX idx_clients_is_vip ON public.clients(is_vip) WHERE is_vip = true;

-- Policies for client_admin_notes: Strictly Admin only
CREATE POLICY "Admins can view client admin notes" 
    ON public.client_admin_notes FOR SELECT 
    TO authenticated 
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage client admin notes" 
    ON public.client_admin_notes FOR ALL 
    TO authenticated 
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger to update updated_at and updated_by automatically
CREATE OR REPLACE FUNCTION public.handle_client_admin_notes_audit()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_audit_client_admin_notes
    BEFORE INSERT OR UPDATE ON public.client_admin_notes
    FOR EACH ROW EXECUTE FUNCTION public.handle_client_admin_notes_audit();
