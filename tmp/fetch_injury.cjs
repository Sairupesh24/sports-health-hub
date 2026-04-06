const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
    const { data: sData } = await supabase.from('sessions').select('*').limit(1);
    const { data: pData } = await supabase.from('physio_session_details').select('*').limit(1);
    const { data: rData } = await supabase.from('rehab_progress').select('*').limit(1);
    
    fs.writeFileSync('tmp/out2.json', JSON.stringify({ sessions: sData, physio_session_details: pData, rehab_progress: rData }, null, 2));
}

test();
