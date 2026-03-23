import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ovntmshmshunpztobqov.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92bnRtc2htc2h1bnB6dG9icW92Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTI3NTE2MywiZXhwIjoyMDU2ODUxMTYzfQ.W_XmG9WfG7p0_k_f9Z_v1-v4_v1-v4_v1-v4'; // SERVICE ROLE KEY

async function checkForeignKeys() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log("Checking sessions table columns and potential FK names...");
    
    // Check raw data to see relationship hints
    const { data: rawData, error: rawError } = await supabase
        .from('sessions')
        .select(`
            id,
            therapist_id,
            scientist_id
        `)
        .limit(1);
        
    if (rawError) {
        console.error('Raw error:', rawError);
    } else {
        console.log('Sample data (columns present):', rawData);
    }

    // Try to perform the query I wrote to see if it fails and why
    const { data: testData, error: testError } = await supabase
        .from('sessions')
        .select(`
            id,
            therapist:profiles!sessions_therapist_id_fkey(first_name, last_name),
            scientist:profiles!scientist_id(first_name, last_name)
        `)
        .limit(1);

    if (testError) {
        console.error('Test query failed:', testError.message);
    } else {
        console.log('Test query success! Data:', testData);
    }
}

checkForeignKeys();
