import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ovntmshmshunpztobqov.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92bnRtc2htc2h1bnB6dG9icW92Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTI3NTE2MywiZXhwIjoyMDU2ODUxMTYzfQ.W_XmG9WfG7p0_k_f9Z_v1-v4_v1-v4_v1-v4'; // SERVICE ROLE KEY

async function testJoin() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log("Testing join on therapist_id...");
    
    // Use the explicit FK name from types.ts: sessions_therapist_id_fkey
    const { data, error } = await supabase
        .from('sessions')
        .select(`
            id,
            service_type,
            therapist_id,
            therapist:profiles!sessions_therapist_id_fkey(first_name, last_name, email)
        `)
        .limit(10);
        
    if (error) {
        console.error('Error:', error.message);
        // Try without explicit FK
        const { data: d2, error: e2 } = await supabase
            .from('sessions')
            .select(`
                id,
                therapist:profiles!therapist_id(first_name, last_name)
            `)
            .limit(5);
        if (e2) console.error('Fallback error:', e2.message);
        else console.log('Fallback Success:', d2);
    } else {
        console.log('Success!', data);
    }
}

testJoin();
