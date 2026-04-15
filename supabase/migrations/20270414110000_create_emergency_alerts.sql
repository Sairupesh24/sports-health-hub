-- Function to handle updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create Emergency Alerts Table
CREATE TABLE IF NOT EXISTS public.emergency_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unresolved', -- 'unresolved', 'resolved'
    admin_decision TEXT, -- 'reassigned', 'broadcasted', 'noted'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.emergency_alerts ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Everyone in the same organization can see alerts (for dash visibility)
DROP POLICY IF EXISTS "Users can view org emergency alerts" ON public.emergency_alerts;
CREATE POLICY "Users can view org emergency alerts" ON public.emergency_alerts
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- 2. Staff can insert their own alerts
DROP POLICY IF EXISTS "Staff can insert emergency alerts" ON public.emergency_alerts;
CREATE POLICY "Staff can insert emergency alerts" ON public.emergency_alerts
    FOR INSERT WITH CHECK (
        staff_id = auth.uid()
    );

-- 3. Admins can update alerts (for resolution)
DROP POLICY IF EXISTS "Admins can update emergency alerts" ON public.emergency_alerts;
CREATE POLICY "Admins can update emergency alerts" ON public.emergency_alerts
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
        AND (
            public.has_role(auth.uid(), 'admin') 
            OR public.has_role(auth.uid(), 'super_admin') 
        )
    );

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_emergency_alerts_updated_at ON public.emergency_alerts;
CREATE TRIGGER update_emergency_alerts_updated_at
    BEFORE UPDATE ON public.emergency_alerts
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Create index for faster querying
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_org_status ON public.emergency_alerts(organization_id, status);
