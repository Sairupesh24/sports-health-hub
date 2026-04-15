import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';
const ORG_ID = '95d6393e-68ab-4839-9b35-a11562cfc150';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function runSmokeTest() {
    console.log('\n======================================');
    console.log('EMERGENCY MODULE - FINAL SMOKE TEST v2');
    console.log('======================================\n');

    // Test 1: EmergencyResponseModal
    console.log('[TEST 1] EmergencyResponseModal: Two-step fetch');
    const { data: alertsData, error: aErr } = await supabase
        .from('emergency_alerts')
        .select('*')
        .eq('organization_id', ORG_ID)
        .eq('status', 'unresolved')
        .order('created_at', { ascending: false });

    if (aErr) {
        console.error(' ❌ FAILED:', aErr.message);
    } else {
        console.log(` ✅ PASS - ${alertsData?.length ?? 0} unresolved alerts`);
        if (alertsData && alertsData.length > 0) {
            const staffIds = alertsData.map((a: any) => a.staff_id);
            const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name, profession').in('id', staffIds);
            const merged = alertsData.map((a: any) => ({ reason: a.reason, staff: profiles?.find((p: any) => p.id === a.staff_id) }));
            console.log('    Active alerts:', merged.map((m: any) => `"${m.reason}" by ${m.staff?.first_name} ${m.staff?.last_name} (${m.staff?.profession})`).join(', '));
        }
    }

    // Test 2: FOEDashboard with expanded roles
    console.log('\n[TEST 2] FOEDashboard: Expanded clinical roles fetch');
    const clinicalRoles = ['consultant', 'sports_physician', 'physiotherapist', 'nutritionist', 'massage_therapist', 'sports_scientist'];
    const { data: roleData } = await supabase.from('user_roles').select('user_id').in('role', clinicalRoles);
    
    if (!roleData || roleData.length === 0) {
        console.log(' ⚠️  Still no clinical staff found in user_roles');
    } else {
        const staffIds = [...new Set(roleData.map((r: any) => r.user_id))];
        console.log(` ✅ PASS - Found ${staffIds.length} unique clinical staff IDs`);
        
        const { data: profiles, error: pErr } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .eq('organization_id', ORG_ID)
            .in('id', staffIds);

        if (pErr) {
            console.error(' ❌ FAILED - profiles:', pErr.message);
        } else {
            console.log(` ✅ PASS - ${profiles?.length ?? 0} clinical profiles in this org`);
            if (profiles) profiles.forEach((p: any) => console.log(`    - ${p.first_name} ${p.last_name}`));
        }
    }

    // Test 3: Attendance table name
    console.log('\n[TEST 3] Attendance: Finding correct table name');
    const tables = ['attendance_logs', 'attendance', 'staff_attendance', 'daily_attendance'];
    for (const table of tables) {
        const { error } = await supabase.from(table as any).select('id').limit(1);
        if (!error) {
            console.log(` ✅ FOUND - Table: '${table}'`);
            break;
        } else {
            console.log(` ⚠️  Not found: '${table}'`);
        }
    }

    console.log('\n======================================\n');
}

runSmokeTest().catch(console.error);
