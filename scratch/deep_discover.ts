import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function deepDiscover() {
    // 1. Discover hr_attendance_logs columns
    console.log('[DISCOVER] hr_attendance_logs columns:');
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, { headers: { 'apikey': SERVICE_KEY } });
    const api = await res.json();
    const cols = Object.keys(api.definitions?.hr_attendance_logs?.properties || {});
    console.log(cols);

    // 2. Try fetching 1 row to see structure
    const { data: row, error } = await supabase.from('hr_attendance_logs').select('*').limit(1);
    if (error) console.error('Fetch error:', error.message);
    else console.log('\nSample row:', JSON.stringify(row?.[0], null, 2));

    // 3. Discover user_roles for all users in this org
    console.log('\n[DISCOVER] All users and their roles in this org:');
    const { data: roles, error: rErr } = await supabase
        .from('user_roles')
        .select('user_id, role, profiles(id, first_name, last_name, organization_id)')
        .limit(30);
    if (rErr) console.error(rErr.message);
    else {
        roles?.forEach((r: any) => {
            const p = r.profiles;
            if (p?.organization_id === '95d6393e-68ab-4839-9b35-a11562cfc150') {
                console.log(`  ${p.first_name} ${p.last_name}: ${r.role}`);
            }
        });
    }
}

deepDiscover().catch(console.error);
