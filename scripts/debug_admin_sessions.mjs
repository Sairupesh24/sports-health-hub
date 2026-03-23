import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ovntmshmshunpztobqov.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92bnRtc2htc2h1bnB6dG9icW92Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTI3NTE2MywiZXhwIjoyMDU2ODUxMTYzfQ.W_XmG9WfG7p0_k_f9Z_v1-v4_v1-v4_v1-v4';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const clientId = '9308fe37-c7ba-4bba-9f22-386002f2679c'; // Sample client ID from previous logs if available, or I'll need to find one.

async function testAdminQuery() {
    console.log('Testing Admin Query for client:', clientId);
    
    let { data, error } = await supabase
        .from('sessions')
        .select(`
            *,
            therapist:profiles!sessions_therapist_id_fkey(first_name, last_name, honorific),
            physio_session_details(*)
        `)
        .eq('client_id', clientId);

    if (error) {
        console.error('Admin Query Error:', error);
    } else {
        console.log('Admin Query Data count:', data?.length);
        if (data && data.length > 0) {
            console.log('Sample data:', JSON.stringify(data[0], null, 2));
        }
    }

    console.log('\nTesting Simplified Query (no therapist join):');
    let { data: simData, error: simError } = await supabase
        .from('sessions')
        .select(`
            *,
            physio_session_details(*)
        `)
        .eq('client_id', clientId);

    if (simError) {
        console.error('Simplified Query Error:', simError);
    } else {
        console.log('Simplified Query Data count:', simData?.length);
    }
}

testAdminQuery();
