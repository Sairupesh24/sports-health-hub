const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Known client_id from previous query
const CLIENT_ID = '9c8e4d9e-94ea-4aef-8c2c-29f2a8b6c54e';

async function test() {
    // Check full injury record with notes and extra fields
    const { data: injData, error: injError } = await supabase
        .from('injuries')
        .select('*')
        .limit(3);

    // Check sessions without status filter
    const { data: sessData, error: sessError } = await supabase
        .from('sessions')
        .select(`
            id, scheduled_start, therapist_id, status,
            therapist:profiles!sessions_therapist_id_fkey(first_name, last_name, honorific, profession)
        `)
        .eq('client_id', CLIENT_ID)
        .not('therapist_id', 'is', null)
        .order('scheduled_start', { ascending: false })
        .limit(3);

    fs.writeFileSync('tmp/out_verify3.json', JSON.stringify({
        injData, injError,
        sessData, sessError
    }, null, 2));
}

test();
