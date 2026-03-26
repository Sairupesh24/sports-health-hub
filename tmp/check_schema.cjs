const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
    console.log('Checking profiles and user_roles schema...');
    
    // Check profiles columns
    const { data: pData, error: pError } = await supabase.from('profiles').select('*').limit(1);
    if (pError) {
        console.error('Profiles Query Error:', pError.message);
    } else if (pData && pData.length > 0) {
        console.log('Profiles columns:', Object.keys(pData[0]));
    } else {
        console.log('No profiles found to check columns.');
    }

    // Check if user_roles table exists and has columns
    const { data: rData, error: rError } = await supabase.from('user_roles').select('*').limit(1);
    if (rError) {
        console.log('user_roles table not found or error:', rError.message);
    } else if (rData && rData.length > 0) {
        console.log('user_roles columns:', Object.keys(rData[0]));
    } else {
        console.log('user_roles table exists but is empty.');
    }
}

checkSchema();
