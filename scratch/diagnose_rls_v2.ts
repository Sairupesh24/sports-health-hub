import { createClient } from '@supabase/supabase-js';

// Use the PUBLISHABLE key (same as the frontend uses)
const SUPABASE_URL = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_JIxocgRVcXQFFH6msmQ26Q_Qz-ficgl';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';

const userSupabase = createClient(SUPABASE_URL, PUBLISHABLE_KEY);
const serviceSupabase = createClient(SUPABASE_URL, SERVICE_KEY);
const ORG_ID = '95d6393e-68ab-4839-9b35-a11562cfc150';

async function diagnose() {
    console.log('\n============================');
    console.log('RLS DIAGNOSIS');
    console.log('============================\n');

    // 1. Sign in as admin
    console.log('[1] Signing in as Admin...');
    const { data: authData, error: authError } = await userSupabase.auth.signInWithPassword({
        email: 'test_clinic_admin@ishpo.com',
        password: 'password123'
    });
    if (authError) {
        console.error(' ❌ Auth failed:', authError.message);
        return;
    }
    console.log(` ✅ Signed in uid: ${authData.user?.id}`);

    // 2. Try reading emergency_alerts as admin (RLS active)
    console.log('\n[2] emergency_alerts SELECT as Admin (subject to RLS)...');
    const { data: alerts, error: aErr } = await userSupabase
        .from('emergency_alerts' as any)
        .select('*')
        .eq('organization_id', ORG_ID)
        .eq('status', 'unresolved');
    
    if (aErr) {
        console.error(' ❌ FETCH ERROR:', aErr.message, aErr.code);
    } else {
        console.log(` Result: ${alerts?.length ?? 0} alerts`);
        if (alerts && alerts.length > 0) {
            console.log(' ✅ Admin CAN see alerts - issue is elsewhere');
        } else {
            console.log(' ⚠️  RLS is blocking — Admin sees 0 alerts');
        }
    }

    // 3. Compare with service role
    console.log('\n[3] Same query with service role (bypasses RLS)...');
    const { data: svcAlerts } = await serviceSupabase
        .from('emergency_alerts' as any)
        .select('*')
        .eq('organization_id', ORG_ID)
        .eq('status', 'unresolved');
    console.log(` Service key sees: ${svcAlerts?.length ?? 0} alerts`);
    if (svcAlerts && svcAlerts.length > 0) {
        console.log(' Sample alert:', JSON.stringify({ id: svcAlerts[0].id, reason: svcAlerts[0].reason, status: svcAlerts[0].status }, null, 2));
    }

    await userSupabase.auth.signOut();
    console.log('\n============================\n');
}

diagnose().catch(console.error);
