const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
    console.log('Querying information_schema...');
    // We can't query information_schema directly via .from() because it's not in 'public'
    // unless postgrest is configured for it.
    // Instead, I'll try to use a simple 'select' on a table we know exists.
    
    const { data: profiles, error: pError } = await supabase.from('profiles').select('count').limit(1);
    console.log('Profiles test:', pError ? pError.message : 'OK');

    const { data: ex, error: eError } = await supabase.from('exercises').select('id').limit(1);
    console.log('Exercises test:', eError ? eError.message : 'OK');
}

check();
