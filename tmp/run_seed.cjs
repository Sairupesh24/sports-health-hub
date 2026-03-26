const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seed() {
    console.log('🌱 Starting exercise seeding...');
    
    // Read the seed file
    const seedPath = path.join(__dirname, '..', 'supabase', 'seed_exercises.sql');
    const sql = fs.readFileSync(seedPath, 'utf8');
    
    // The seed file uses DO $$ BEGIN ... END $$; blocks which can be executed via RPC if 'exec' exists,
    // or we can try to parse the INSERT statements.
    // However, the easiest way to run raw SQL via the service role key is using a custom RPC or 
    // simply making a POST request to the /rest/v1/rpc/exec (if available).
    
    // Let's try to use the 'exercises' table directly if possible, or just log instructions if seeding is too complex for REST.
    // Actually, I'll attempt a direct 'postgres' connection if I had one, but I don't.
    
    console.log('Attempting to execute SQL via RPC...');
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
        console.error('Error executing SQL:', error);
        console.log('\nFallback: Since the seed file is large, please run it manually in the Supabase SQL Editor:');
        console.log('File: ' + seedPath);
    } else {
        console.log('✅ Seeding successful!');
    }
}

seed();
