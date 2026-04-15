import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';

// Use anon key to simulate what the admin browser session sees
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NDM5ODUsImV4cCI6MjA4ODAxOTk4NX0.7lMuMWuHDFsRe_eWFBODGbCMVqJpE1EjFfHxZ9UZ7KQ';

const adminSupabase = createClient(SUPABASE_URL, ANON_KEY);
const serviceSupabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function diagnose() {
    console.log('\n======================================');
    console.log('RLS POLICY DIAGNOSIS');
    console.log('======================================\n');

    const ADMIN_EMAIL = 'test_clinic_admin@ishpo.com';
    const ADMIN_PASS = 'password123';
    const ORG_ID = '95d6393e-68ab-4839-9b35-a11562cfc150';

    // 1. Sign in as admin
    console.log('[1] Signing in as Admin...');
    const { data: authData, error: authError } = await adminSupabase.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password: ADMIN_PASS
    });
    if (authError) {
        console.error(' ❌ Auth failed:', authError.message);
        return;
    }
    console.log(` ✅ Signed in: ${authData.user?.email}, uid: ${authData.user?.id}`);

    // 2. Try reading emergency_alerts as the admin user
    console.log('\n[2] Fetching emergency_alerts as Admin (RLS active)...');
    const { data: alerts, error: aErr } = await adminSupabase
        .from('emergency_alerts')
        .select('*')
        .eq('organization_id', ORG_ID)
        .eq('status', 'unresolved');
    
    if (aErr) {
        console.error(' ❌ FAILED (RLS blocking):', aErr.message);
    } else {
        console.log(` Got ${alerts?.length ?? 0} alerts (with RLS)`);
        if (alerts && alerts.length > 0) {
            console.log(' ✅ RLS PASS - Admin can see alerts!', JSON.stringify(alerts[0], null, 2));
        } else {
            console.log(' ⚠️  RLS FILTERING OUT alerts — admin sees 0 even though data exists!');
        }
    }

    // 3. Compare with service role (bypass RLS)
    console.log('\n[3] Same query with service role (no RLS)...');
    const { data: serviceAlerts } = await serviceSupabase
        .from('emergency_alerts')
        .select('*')
        .eq('organization_id', ORG_ID)
        .eq('status', 'unresolved');
    console.log(` Service role sees: ${serviceAlerts?.length ?? 0} alerts`);

    // 4. Check existing RLS policies
    console.log('\n[4] Current RLS policies on emergency_alerts...');
    const { data: policies } = await serviceSupabase.rpc('exec_sql', {
        sql_query: `
            SELECT policyname, cmd, qual, with_check
            FROM pg_policies 
            WHERE tablename = 'emergency_alerts'
        `
    });
    console.log('Policies (raw):', JSON.stringify(policies, null, 2));
}

diagnose().catch(console.error);
