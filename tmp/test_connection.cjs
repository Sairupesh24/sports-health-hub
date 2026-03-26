const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
    console.log('Testing connection to Supabase...');
    try {
        const { data, error } = await supabase.from('profiles').select('id').limit(1);
        if (error) {
            console.error('Connection test failed:', error.message);
        } else {
            console.log('✅ Connection successful! Profiles found.');
            
            console.log('Testing if "exercises" table exists...');
            const { data: exData, error: exError } = await supabase.from('exercises').select('id').limit(1);
            if (exError) {
                console.log('❌ Exercises table NOT found or error:', exError.message);
            } else {
                console.log('✅ Exercises table FOUND!');
            }
        }
    } catch (err) {
        console.error('Critical failure:', err.message);
    }
}

test();
