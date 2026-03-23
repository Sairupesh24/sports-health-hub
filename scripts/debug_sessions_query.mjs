import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ovntmshmshunpztobqov.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92bnRtc2htc2h1bnB6dG9icW92Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTI3NTE2MywiZXhwIjoyMDU2ODUxMTYzfQ.W_XmG9WfG7p0_k_f9Z_v1-v4_v1-v4_v1-v4'; // SERVICE ROLE KEY

async function testQuery() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const id = '7b63f175-b62d-4f1d-9089-d8ab364729b1'; // John Doe's ID
    
    console.log("Testing full query for client ID:", id);
    
    const { data, error } = await supabase
        .from('sessions')
        .select(`
            id,
            status,
            scheduled_start,
            session_mode,
            group_name,
            therapist:profiles!sessions_therapist_id_fkey(first_name, last_name, honorific),
            scientist:profiles!scientist_id(first_name, last_name, honorific),
            service_type,
            physio_session_details(*)
        `)
        .eq('client_id', id);

    if (error) {
        console.error('FULL QUERY FAILED:', error.message);
        
        // Try without aliases
        const { data: d2, error: e2 } = await supabase
            .from('sessions')
            .select(`
                id,
                therapist_id,
                scientist_id
            `)
            .eq('client_id', id);
        if (e2) console.error('SIMPLE QUERY FAILED:', e2.message);
        else console.log('SIMPLE QUERY SUCCESS, COUNT:', d2.length);
    } else {
        console.log('FULL QUERY SUCCESS, COUNT:', data.length);
    }
}

testQuery();
