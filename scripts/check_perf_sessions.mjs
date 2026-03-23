import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ovntmshmshunpztobqov.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92bnRtc2htc2h1bnB6dG9icW92Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTI3NTE2MywiZXhwIjoyMDU2ODUxMTYzfQ.W_XmG9WfG7p0_k_f9Z_v1-v4_v1-v4_v1-v4'; // SERVICE ROLE KEY

async function checkPerformanceSessions() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log("Checking PERFORMANCE sessions...");
    
    const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .limit(5);
        
    if (error) {
        console.error('Error:', error.message);
    } else {
        data.forEach(s => {
            console.log(`Session ID: ${s.id}, Type: ${s.service_type}, Therapist ID: ${s.therapist_id}, Scientist ID: ${s.scientist_id}`);
        });
    }
}

checkPerformanceSessions();
