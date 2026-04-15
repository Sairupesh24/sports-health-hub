import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const sql = `
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
DROP POLICY IF EXISTS "Users can view org emergency alerts" ON public.emergency_alerts;
CREATE POLICY "Users can view org emergency alerts" ON public.emergency_alerts
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Staff can insert emergency alerts" ON public.emergency_alerts;
CREATE POLICY "Staff can insert emergency alerts" ON public.emergency_alerts
    FOR INSERT WITH CHECK (
        staff_id = auth.uid()
    );

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
`;

async function applyMigration() {
    console.log("Applying emergency_alerts migration...");
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
        console.error("Migration failed:", error);
    } else {
        console.log("Migration applied successfully.");
    }
}

applyMigration();
