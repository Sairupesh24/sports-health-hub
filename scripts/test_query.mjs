import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ovntmshmshunpztobqov.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92bnRtc2htc2h1bnB6dG9icW92Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTI3NTE2MywiZXhwIjoyMDU2ODUxMTYzfQ.W_XmG9WfG7p0_k_f9Z_v1-v4_v1-v4_v1-v4'; // SERVICE ROLE KEY

async function testQuery() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const id = '7b63f175-b62d-4f1d-9089-d8ab364729b1'; // John Doe's ID
    
    console.log("Testing query for client ID:", id);
    
    // Test 1: Simplest query
    const { data: d1, error: e1 } = await supabase.from('sessions').select('*').eq('client_id', id);
    console.log('Test 1 (*):', e1 ? e1.message : `Success, count: ${d1.length}`);

    // Test 2: With therapist_id FK name (what I used)
    const { data: d2, error: e2 } = await supabase
        .from('sessions')
        .select(`
            id,
            therapist:profiles!sessions_therapist_id_fkey(first_name)
        `)
        .eq('client_id', id);
    console.log('Test 2 (sessions_therapist_id_fkey):', e2 ? e2.message : `Success, count: ${d2.length}`);

    // Test 3: With therapist_id column explicit
    const { data: d3, error: e3 } = await supabase
        .from('sessions')
        .select(`
            id,
            therapist:profiles!therapist_id(first_name)
        `)
        .eq('client_id', id);
    console.log('Test 3 (!therapist_id):', e3 ? e3.message : `Success, count: ${d3.length}`);

    // Test 4: Scientist FK
    const { data: d4, error: e4 } = await supabase
        .from('sessions')
        .select(`
            id,
            scientist:profiles!scientist_id(first_name)
        `)
        .eq('client_id', id);
    console.log('Test 4 (!scientist_id):', e4 ? e4.message : `Success, count: ${d4.length}`);
}

testQuery();
