import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function renameConstraints() {
    const sql = `
        DO $$ 
        BEGIN 
            -- Drop existing FK on staff_id if it exists (guessing common names)
            ALTER TABLE public.emergency_alerts DROP CONSTRAINT IF EXISTS emergency_alerts_staff_id_fkey;
            ALTER TABLE public.emergency_alerts DROP CONSTRAINT IF EXISTS emergency_alerts_staff_id_profiles_id_fk;
            
            -- Add named constraint
            ALTER TABLE public.emergency_alerts 
            ADD CONSTRAINT staff_link FOREIGN KEY (staff_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

            -- Drop existing FK on organization_id if it exists
            ALTER TABLE public.emergency_alerts DROP CONSTRAINT IF EXISTS emergency_alerts_organization_id_fkey;
            ALTER TABLE public.emergency_alerts DROP CONSTRAINT IF EXISTS emergency_alerts_organization_id_organizations_id_fk;

            -- Add named constraint
            ALTER TABLE public.emergency_alerts 
            ADD CONSTRAINT org_link FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
        EXCEPTION
            WHEN OTHERS THEN RAISE NOTICE '%', SQLERRM;
        END $$;
    `;
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    console.log(JSON.stringify({ data, error }, null, 2));
}

renameConstraints();
