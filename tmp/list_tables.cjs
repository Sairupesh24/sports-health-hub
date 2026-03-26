const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listTables() {
    console.log('Listing all visible tables in project fbjlgepxbyoyradaacvd...');
    // We can't query pg_tables directly unless it's exposed.
    // But we can try to use a common one.
    const tables = ['profiles', 'organizations', 'exercises', 'test_table', 'performance_assessments'];
    
    for (const t of tables) {
        const { data, error } = await supabase.from(t).select('count').limit(1);
        console.log(`${t}: ${error ? '❌ ' + error.message : '✅ FOUND'}`);
    }
}

listTables();
