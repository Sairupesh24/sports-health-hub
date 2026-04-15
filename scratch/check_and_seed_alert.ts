import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_JIxocgRVcXQFFH6msmQ26Q_Qz-ficgl';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';
const ORG_ID = '95d6393e-68ab-4839-9b35-a11562cfc150';
// Doctor Test's profile ID (sports_physician)
const DOCTOR_STAFF_ID = '038534d3-100f-43b3-a68a-fffc3ba8ab62';

const userClient = createClient(SUPABASE_URL, PUBLISHABLE_KEY);
const svcClient = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkAndSeed() {
    console.log('\n==== EMERGENCY MODULE: LIVE STATE CHECK ====\n');

    // 1. Check current alerts (as service role)
    const { data: all } = await svcClient.from('emergency_alerts' as any).select('*').eq('organization_id', ORG_ID);
    console.log('Total alerts in DB:', all?.length ?? 0);
    all?.forEach((a: any) => console.log(`  - "${a.reason}" | status: ${a.status} | created: ${a.created_at}`));

    const unresolved = all?.filter((a: any) => a.status === 'unresolved');
    console.log('\nUnresolved:', unresolved?.length ?? 0);

    // 2. If 0 unresolved, create a test alert
    if ((unresolved?.length ?? 0) === 0) {
        console.log('\n→ No unresolved alerts. Creating a fresh test alert...');
        const { data: inserted, error } = await svcClient.from('emergency_alerts' as any).insert({
            organization_id: ORG_ID,
            staff_id: DOCTOR_STAFF_ID,
            reason: 'LIVE TEST - Emergency Module Verification',
            status: 'unresolved'
        }).select('*');
        if (error) console.error('Insert failed:', error.message);
        else console.log('✅ Created alert:', inserted?.[0]?.id);
    } else {
        console.log('✅ Unresolved alerts exist, no seeding needed.');
    }

    // 3. Verify admin can read it via user session
    console.log('\n==== ADMIN RLS VERIFICATION ====');
    const { error: loginErr } = await userClient.auth.signInWithPassword({
        email: 'test_clinic_admin@ishpo.com', password: 'password123'
    });
    if (loginErr) { console.error('Login failed:', loginErr.message); return; }
    console.log('Signed in as admin');

    const { data: adminView, error: viewErr } = await (userClient as any)
        .from('emergency_alerts')
        .select('id, reason, status')
        .eq('organization_id', ORG_ID)
        .eq('status', 'unresolved');

    if (viewErr) console.error('❌ Admin query error:', viewErr.message, viewErr.code);
    else console.log(`✅ Admin sees ${adminView?.length ?? 0} unresolved alerts via RLS`);
    adminView?.forEach((a: any) => console.log(`  - "${a.reason}"`));

    await userClient.auth.signOut();
    console.log('\n=====\nNow refresh the admin dashboard and click the alert icon.\n=====\n');
}

checkAndSeed().catch(console.error);
