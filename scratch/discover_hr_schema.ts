import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';

const svc = createClient(SUPABASE_URL, SERVICE_KEY);

async function discover() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, { headers: { 'apikey': SERVICE_KEY } });
    const api = await res.json();

    console.log('\n=== hr_leaves columns ===');
    console.log(Object.keys(api.definitions?.hr_leaves?.properties || {}));

    console.log('\n=== hr_attendance_logs columns ===');
    console.log(Object.keys(api.definitions?.hr_attendance_logs?.properties || {}));

    console.log('\n=== Sample hr_leaves row ===');
    const { data: leaves } = await svc.from('hr_leaves').select('*').limit(3);
    console.log(JSON.stringify(leaves, null, 2));

    console.log('\n=== Sample hr_attendance_logs row ===');
    const { data: logs } = await svc.from('hr_attendance_logs').select('*').limit(3);
    console.log(JSON.stringify(logs, null, 2));
}

discover().catch(console.error);
