import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ovntmshmshunpztobqov.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92bnRtc2htc2h1bnB6dG9icW92Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTI3NTE2MywiZXhwIjoyMDU2ODUxMTYzfQ.W_XmG9WfG7p0_k_f9Z_v1-v4_v1-v4_v1-v4'; // SERVICE ROLE KEY

async function testQuery() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const id = '7b63f175-b62d-4f1d-9089-d8ab364729b1'; // John Doe's ID from previous scripts
    
    console.log("Testing query for client ID:", id);
    
    const { data, error } = await supabase
        .from('sessions')
        .select(`
            id,
            status,
            scheduled_start,
            session_mode,
            group_name,
            therapist:profiles!therapist_id(first_name, last_name, honorific),
            scientist:profiles!scientist_id(first_name, last_name, honorific),
            service_type,
            physio_session_details(*)
        `)
        .eq('client_id', id);

    if (error) {
        console.error('Query failed with !therapist_id:', error.message);
        
        // Try fallback with the names I used in the component
        const { data: data2, error: error2 } = await supabase
            .from('sessions')
            .select(`
                id,
                therapist:profiles!sessions_therapist_id_fkey(first_name, last_name, honorific),
                scientist:profiles!scientist_id(first_name, last_name, honorific)
            `)
            .eq('client_id', id);
            
        if (error2) {
            console.error('Query failed with sessions_therapist_id_fkey:', error2.message);
        } else {
            console.log('Query success with sessions_therapist_id_fkey! Count:', data2.length);
        }
    } else {
        console.log('Query success with !therapist_id! Count:', data.length);
    }
}

testQuery();
