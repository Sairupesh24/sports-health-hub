const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkBatchTables() {
    console.log('Checking for batch-related tables...');
    const tables = ['batches', 'batch_members', 'athlete_batches', 'groups'];
    
    for (const t of tables) {
        try {
            const { data, error } = await supabase.from(t).select('count').limit(1);
            if (error) {
                console.log(`${t}: ❌ ${error.message}`);
            } else {
                console.log(`${t}: ✅ FOUND`);
            }
        } catch (err) {
            console.log(`${t}: ❌ ${err.message}`);
        }
    }
}

checkBatchTables();
