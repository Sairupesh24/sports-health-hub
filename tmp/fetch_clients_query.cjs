const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
    const { data: iData, error } = await supabase
        .from('injuries')
        .select(`
            id,
            client_id,
            client:clients!injuries_client_id_fkey(id, first_name, last_name)
        `)
        .limit(1);
        
    const { data: pData, error: pError } = await supabase
        .from('profiles')
        .select(`id, first_name, assigned_consultant_id, consultant:profiles!assigned_consultant_id(first_name)`)
        .limit(1);
    
    fs.writeFileSync('tmp/out_query2.json', JSON.stringify({ injuries: iData, iError: error, profiles: pData, pError: pError }, null, 2));
}

test();
