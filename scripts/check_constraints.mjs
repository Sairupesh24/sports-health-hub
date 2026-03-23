import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ovntmshmshunpztobqov.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92bnRtc2htc2h1bnB6dG9icW92Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTI3NTE2MywiZXhwIjoyMDU2ODUxMTYzfQ.W_XmG9WfG7p0_k_f9Z_v1-v4_v1-v4_v1-v4'; // SERVICE ROLE KEY

async function checkConstraints() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const sql = `
        SELECT
            tc.constraint_name, 
            kcu.column_name, 
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name 
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='sessions';
    `;

    console.log("Fetching constraints for 'sessions' table...");
    
    // We can't run raw SQL easily via Supabase client without a custom RPC
    // Let's try to find an existing RPC or check the simple relationship names
    const { data, error } = await supabase.from('sessions').select('*').limit(1);
    
    if (error) {
        console.error('Error fetching sessions sample:', error.message);
    } else {
        console.log('Columns in sessions:', Object.keys(data[0] || {}).join(', '));
    }

    // Attempting query without aliases to see if PostgREST can resolve them
    const { data: d2, error: e2 } = await supabase
        .from('sessions')
        .select(`
            id,
            profiles!therapist_id(first_name)
        `)
        .limit(1);
    
    if (e2) console.error('Relationship !therapist_id failed:', e2.message);
    else console.log('Relationship !therapist_id SUCCESS');

    const { data: d3, error: e3 } = await supabase
        .from('sessions')
        .select(`
            id,
            profiles!scientist_id(first_name)
        `)
        .limit(1);
    
    if (e3) console.error('Relationship !scientist_id failed:', e3.message);
    else console.log('Relationship !scientist_id SUCCESS');
}

checkConstraints();
