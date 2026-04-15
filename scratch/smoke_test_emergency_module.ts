import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';
const ORG_ID = '95d6393e-68ab-4839-9b35-a11562cfc150';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function runSmokeTest() {
    console.log('\n======================================');
    console.log('EMERGENCY MODULE - API SMOKE TEST');
    console.log('======================================\n');

    // Test 1: Fetch emergency alerts with two-step client-side join (simulating EmergencyResponseModal)
    console.log('[TEST 1] EmergencyResponseModal: Two-step fetch (alerts + profiles)');
    const { data: alertsData, error: aErr } = await supabase
        .from('emergency_alerts')
        .select('*')
        .eq('organization_id', ORG_ID)
        .eq('status', 'unresolved')
        .order('created_at', { ascending: false });

    if (aErr) {
        console.error(' ❌ FAILED - Could not fetch alerts:', aErr.message);
    } else {
        console.log(` ✅ PASS - Fetched ${alertsData?.length ?? 0} unresolved alerts`);
        if (alertsData && alertsData.length > 0) {
            const staffIds = alertsData.map((a: any) => a.staff_id);
            const { data: profiles, error: pErr } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, profession')
                .in('id', staffIds);
            if (pErr) {
                console.error(' ❌ FAILED - Could not fetch profiles:', pErr.message);
            } else {
                const merged = alertsData.map((a: any) => ({
                    ...a,
                    staff: profiles?.find((p: any) => p.id === a.staff_id)
                }));
                console.log(' ✅ PASS - Merged alerts with staff profiles successfully');
                console.log('    Sample:', JSON.stringify({ reason: merged[0].reason, staff: merged[0].staff }, null, 2));
            }
        }
    }

    // Test 2: Fetch profiles with separate emergency alerts join (simulating FOEDashboard)
    console.log('\n[TEST 2] FOEDashboard: Two-step fetch (profiles + alerts)');
    const { data: roleData } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'consultant');

    if (!roleData || roleData.length === 0) {
        console.log(' ⚠️  No consultants found in user_roles');
    } else {
        const consultantIds = roleData.map((r: any) => r.user_id);
        const { data: profiles, error: pErr } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, consultant_availability(*)')
            .eq('organization_id', ORG_ID)
            .in('id', consultantIds)
            .eq('is_approved', true);

        if (pErr) {
            console.error(' ❌ FAILED - Could not fetch profiles:', pErr.message);
        } else {
            console.log(` ✅ PASS - Fetched ${profiles?.length ?? 0} consultant profiles`);
            const { data: alerts, error: aErr } = await supabase
                .from('emergency_alerts')
                .select('id, staff_id, status')
                .in('staff_id', consultantIds)
                .eq('status', 'unresolved');

            if (aErr) {
                console.error(' ❌ FAILED - Could not fetch alerts:', aErr.message);
            } else {
                const merged = profiles?.map(p => ({
                    ...p,
                    emergency_alerts: alerts?.filter((a: any) => a.staff_id === p.id)
                }));
                const onEmergency = merged?.filter(p => (p.emergency_alerts as any[]).length > 0);
                console.log(' ✅ PASS - Merged profiles with alert status');
                console.log(`    ${onEmergency?.length ?? 0} consultants currently on emergency leave`);
                if (onEmergency && onEmergency.length > 0) {
                    console.log('    On Emergency:', onEmergency.map(p => `${p.first_name} ${p.last_name}`).join(', '));
                }
            }
        }
    }

    // Test 3: HR Attendance Logs sanity check
    console.log('\n[TEST 3] HR Attendance Logs: Check today\'s records');
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { data: logs, error: lErr } = await supabase
        .from('attendance_logs')
        .select('check_in, check_out, working_hours, profile:profiles(first_name, last_name)')
        .eq('organization_id', ORG_ID)
        .gte('check_in', todayStart.toISOString())
        .limit(5);
    if (lErr) {
        console.error(' ❌ FAILED - Could not fetch attendance logs:', lErr.message);
    } else {
        console.log(` ✅ PASS - ${logs?.length ?? 0} attendance records today`);
        if (logs && logs.length > 0) {
            logs.forEach((log: any) => {
                const checkout = log.check_out ? new Date(log.check_out).toLocaleTimeString() : '--';
                const wh = log.working_hours !== null ? `${log.working_hours}h` : '0h 0m';
                console.log(`    ${log.profile?.first_name}: ${new Date(log.check_in).toLocaleTimeString()} → ${checkout} | ${wh}`);
            });
        }
    }

    console.log('\n======================================');
    console.log('SMOKE TEST COMPLETE');
    console.log('======================================\n');
}

runSmokeTest().catch(console.error);
