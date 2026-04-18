import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectFunction() {
    console.log('Inspecting current complete_session function source...');
    const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: "SELECT prosrc FROM pg_proc WHERE proname = 'complete_session' ORDER BY oid DESC LIMIT 1;"
    });

    if (error) {
        console.error('Error inspecting function:', error);
    } else {
        console.log('--- FUNCTION SOURCE ---');
        console.log(data?.[0]?.prosrc);
        console.log('--- END SOURCE ---');
    }
}

inspectFunction().catch(console.error);
