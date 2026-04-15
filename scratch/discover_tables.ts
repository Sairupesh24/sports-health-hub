import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function discoverTables() {
    console.log('\n[DISCOVERY] Listing user_roles unique values...');
    const { data: roles, error } = await supabase.from('user_roles').select('role').limit(100);
    if (error) console.error('Error:', error.message);
    else {
        const unique = [...new Set(roles?.map((r: any) => r.role))];
        console.log('Unique roles:', unique);
    }

    console.log('\n[DISCOVERY] Getting OpenAPI table list...');
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        headers: { 'apikey': SERVICE_KEY }
    });
    const api = await res.json();
    const tableNames = Object.keys(api.definitions || {});
    console.log('Tables:', tableNames.filter(t => t.includes('attend')));
    console.log('All tables:', tableNames.sort().join(', '));
}

discoverTables();
