import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';
const ORG_ID = '95d6393e-68ab-4839-9b35-a11562cfc150';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function inspectProfessions() {
    console.log('--- Profiles Profession & Approval ---');
    const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, profession, is_approved')
        .eq('organization_id', ORG_ID);
    
    if (pErr) console.error(pErr);
    else console.log(profiles);
}

inspectProfessions().catch(console.error);
