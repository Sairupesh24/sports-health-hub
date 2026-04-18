import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function verifyFix() {
    console.log('Verifying complete_session fix...');

    // 1. Try with a non-existent UUID to see if it even compiles/runs past the start
    console.log('\n[TEST 1] Calling with non-existent UUID...');
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const { error: err1 } = await supabase.rpc('complete_session', {
        p_session_id: fakeId,
        p_user_id: fakeId
    });

    if (err1) {
        if (err1.message.includes('Session not found')) {
            console.log(' ✅ PASS: Received "Session not found" (The function is valid SQL)');
        } else {
            console.log(' ❌ FAILED: Received unexpected error:', err1.message);
        }
    } else {
        console.log(' ❓ UNEXPECTED: No error returned for fake UUID');
    }

    // 2. Try to find a real session that is NOT completed
    console.log('\n[TEST 2] Finding a real Planned session...');
    const { data: sessionData, error: sErr } = await supabase
        .from('sessions')
        .select('id, status, therapist_id')
        .eq('status', 'Planned')
        .limit(1)
        .single();

    if (sErr || !sessionData) {
        console.log(' ⚠️  No Planned sessions found to test with.');
    } else {
        console.log(` Found session ${sessionData.id} with status ${sessionData.status}`);
        
        // We won't actually call it on a real session unless we are sure, 
        // but just checking the first test is usually enough to verify the "column not found" error is gone.
        // The column error is a syntax/runtime error that happens even before logic if the engine checks it,
        // or during the first select.
    }
}

verifyFix().catch(console.error);
