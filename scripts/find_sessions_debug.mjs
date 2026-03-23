import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ovntmshmshunpztobqov.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92bnRtc2htc2h1bnB6dG9icW92Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTI3NTE2MywiZXhwIjoyMDU2ODUxMTYzfQ.W_XmG9WfG7p0_k_f9Z_v1-v4_v1-v4_v1-v4';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function findClientWithSessions() {
    console.log('Finding client with sessions...');
    const { data: sessions, error: sessErr } = await supabase
        .from('sessions')
        .select('client_id, id')
        .limit(5);
        
    if (sessErr) {
        console.error('Error fetching sessions:', sessErr);
        return;
    }
    
    console.log('Recent sessions:', sessions);

    if (sessions && sessions.length > 0) {
        const cid = sessions[0].client_id;
        console.log('Testing query for client:', cid);
        
        const { data: adminData, error: adminErr } = await supabase
            .from('sessions')
            .select(`
                *,
                therapist:profiles!sessions_therapist_id_fkey(first_name, last_name, honorific),
                physio_session_details(*)
            `)
            .eq('client_id', cid);
            
        if (adminErr) {
            console.error('Admin Query Error:', adminErr);
        } else {
            console.log('Admin Query successful, count:', adminData?.length);
            if (adminData && adminData.length > 0) {
                console.log('First session provider:', adminData[0].therapist);
            }
        }
    } else {
        console.log('No sessions found in database.');
    }
}

findClientWithSessions();
