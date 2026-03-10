-- Add 'checked_in' to appointment_status
ALTER TYPE public.appointment_status ADD VALUE IF NOT EXISTS 'checked_in';

-- Create client_organizations table
CREATE TABLE IF NOT EXISTS public.client_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(organization_id, name)
);

-- Enable RLS for client_organizations
ALTER TABLE public.client_organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org client_organizations" ON public.client_organizations FOR SELECT USING (
    organization_id = public.get_my_org_id()
);
CREATE POLICY "Users can manage client_organizations" ON public.client_organizations FOR ALL USING (
    organization_id = public.get_my_org_id()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (
    user_id = auth.uid() OR organization_id = public.get_my_org_id()
);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (
    user_id = auth.uid() OR organization_id = public.get_my_org_id()
);
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (
    organization_id = public.get_my_org_id()
);
