import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function reinitTable() {
    const sql = `
        -- Drop existing table and dependencies
        DROP TABLE IF EXISTS public.emergency_alerts CASCADE;

        -- Create table with explicit constraint names
        CREATE TABLE public.emergency_alerts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID NOT NULL,
            staff_id UUID NOT NULL,
            reason TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'unresolved',
            admin_decision TEXT,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now(),
            -- NAMED CONSTRAINTS
            CONSTRAINT staff_fkey FOREIGN KEY (staff_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
            CONSTRAINT org_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
        );

        -- RLS Setup
        ALTER TABLE public.emergency_alerts ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Users can view org emergency alerts" ON public.emergency_alerts
            FOR SELECT USING (
                organization_id IN (
                    SELECT organization_id FROM profiles WHERE id = auth.uid()
                )
            );

        CREATE POLICY "Staff can trigger emergencies" ON public.emergency_alerts
            FOR INSERT WITH CHECK (
                auth.uid() = staff_id
            );

        CREATE POLICY "Admins can update emergency alerts" ON public.emergency_alerts
            FOR UPDATE USING (
                EXISTS (
                    SELECT 1 FROM profiles p 
                    WHERE p.id = auth.uid() 
                    AND p.organization_id = emergency_alerts.organization_id
                )
            );

        -- Trigger for updated_at
        CREATE TRIGGER set_updated_at
            BEFORE UPDATE ON public.emergency_alerts
            FOR EACH ROW
            EXECUTE FUNCTION handle_updated_at();
    `;
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    console.log({ error });
}

reinitTable();
