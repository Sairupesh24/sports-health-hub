import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';
const ORG_ID = '95d6393e-68ab-4839-9b35-a11562cfc150';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function inspectOrg() {
    console.log('--- Profiles in Org ---');
    const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('organization_id', ORG_ID);
    
    if (pErr) console.error(pErr);
    else console.log(profiles);

    if (profiles) {
        const ids = profiles.map(p => p.id);
        console.log('--- Roles for these profiles ---');
        const { data: roles, error: rErr } = await supabase
            .from('user_roles')
            .select('user_id, role')
            .in('user_id', ids);
        
        if (rErr) console.error(rErr);
        else console.log(roles);
    }
}

inspectOrg().catch(console.error);
