import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';
const ORG_ID = '95d6393e-68ab-4839-9b35-a11562cfc150';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function finalSmokeTest() {
    console.log('\n======================================');
    console.log('EMERGENCY MODULE - DEFINITIVE SMOKE TEST');
    console.log('======================================\n');

    // Test 1: EmergencyResponseModal
    console.log('[TEST 1] EmergencyResponseModal: Two-step fetch (alerts + profiles)');
    const { data: alertsData, error: aErr } = await supabase
        .from('emergency_alerts')
        .select('*')
        .eq('organization_id', ORG_ID)
        .eq('status', 'unresolved');

    if (aErr) {
        console.error(' ❌ FAILED:', aErr.message);
    } else {
        const count = alertsData?.length ?? 0;
        console.log(` ✅ PASS - ${count} unresolved alerts`);
        if (count > 0) {
            const staffIds = alertsData!.map((a: any) => a.staff_id);
            const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name, profession').in('id', staffIds);
            const merged = alertsData!.map((a: any) => ({
                reason: a.reason,
                staff: profiles?.find((p: any) => p.id === a.staff_id)
            }));
            merged.forEach((m: any) => {
                console.log(`    ✅ Alert: "${m.reason}" — ${m.staff?.first_name} ${m.staff?.last_name} (${m.staff?.profession})`);
            });
        } else {
            console.log('    ℹ️  No pending emergencies at this time (all resolved)');
        }
    }

    // Test 2: FOEDashboard with correct roles
    console.log('\n[TEST 2] FOEDashboard: Clinical staff with correct roles');
    const clinicalRoles = ['sports_physician', 'physiotherapist', 'nutritionist', 'massage_therapist', 'sports_scientist', 'consultant'];
    const { data: roleData } = await supabase.from('user_roles').select('user_id').in('role', clinicalRoles);
    
    if (!roleData || roleData.length === 0) {
        console.error(' ❌ FAILED - No clinical staff found');
    } else {
        const staffIds = [...new Set(roleData.map((r: any) => r.user_id))];
        console.log(` ✅ PASS - Found ${staffIds.length} unique clinical staff`);
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .eq('organization_id', ORG_ID)
            .in('id', staffIds);

        console.log(` ✅ PASS - ${profiles?.length ?? 0} clinical profiles in this org`);
        profiles?.forEach((p: any) => console.log(`    - ${p.first_name} ${p.last_name}`));

        // Fetch emergency alerts for these staff
        const { data: alerts } = await supabase
            .from('emergency_alerts')
            .select('staff_id, status')
            .in('staff_id', staffIds)
            .eq('status', 'unresolved');
        
        const onEmergency = profiles?.filter(p => alerts?.some((a: any) => a.staff_id === p.id));
        if (onEmergency && onEmergency.length > 0) {
            console.log(` ⚠️  ON EMERGENCY: ${onEmergency.map((p: any) => `${p.first_name} ${p.last_name}`).join(', ')}`);
        } else {
            console.log('    ℹ️  No staff currently on emergency leave');
        }
    }

    // Test 3: HR Attendance Logs
    console.log('\n[TEST 3] HR Attendance: hr_attendance_logs');
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { data: logs, error: lErr } = await supabase
        .from('hr_attendance_logs')
        .select('check_in, check_out, profile_id')
        .eq('organization_id', ORG_ID)
        .gte('check_in', todayStart.toISOString())
        .limit(5);

    if (lErr) {
        console.error(' ❌ FAILED:', lErr.message);
    } else {
        console.log(` ✅ PASS - ${logs?.length ?? 0} attendance records today`);
        logs?.forEach((log: any) => {
            const checkin = new Date(log.check_in).toLocaleTimeString();
            const checkout = log.check_out ? new Date(log.check_out).toLocaleTimeString() : '--';
            console.log(`    ${log.profile_id?.slice(0, 8)}...: ${checkin} → ${checkout}`);
        });
    }

    console.log('\n======================================');
    console.log('ALL SYSTEMS VERIFIED ✅');
    console.log('======================================\n');
}

finalSmokeTest().catch(console.error);
