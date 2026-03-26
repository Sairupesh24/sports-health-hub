const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTable() {
    console.log('Checking if exercises table is visible...');
    const { data, error } = await supabase.from('exercises').select('id').limit(1);
    if (error) {
        console.log('Table not yet visible or error:', error.message);
        return false;
    }
    console.log('✅ Table is visible!');
    return true;
}

async function runSeeding() {
    console.log('🚀 Starting Exercise Seeding (Retry)...');
    
    // Wait for schema cache (optional manual wait)
    // console.log('Waiting 5 seconds for schema cache...');
    // await new Promise(r => setTimeout(r, 5000));

    if (!await checkTable()) {
        console.log('Attempting to trigger schema reload via RPC...');
        await supabase.rpc('exec_sql', { sql_query: "NOTIFY pgrst, 'reload schema';" }).catch(() => {});
        await new Promise(r => setTimeout(r, 2000));
        if (!await checkTable()) {
            console.error('❌ Table exercises still not visible. Aborting.');
            return;
        }
    }

    try {
        const seedPath = path.join(__dirname, '..', 'supabase', 'seed_exercises.sql');
        const content = fs.readFileSync(seedPath, 'utf8');
        
        const exerciseRegex = /\(\s*'([^']+)'\s*,\s*'([^']*)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*ARRAY\[([^\]]+)\]\s*,\s*'([^']+)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*(true|false)\s*\)/g;
        
        const exercises = [];
        let match;
        
        while ((match = exerciseRegex.exec(content)) !== null) {
            const [_, name, description, category, equipment_type, difficulty_level, muscle_groups_str, body_region, equipment_required, instructions, is_rehabilitation_str] = match;
            const muscle_groups = muscle_groups_str.split(',').map(s => s.trim().replace(/'/g, ''));
            exercises.push({
                name, description, category, equipment_type, difficulty_level, muscle_groups, body_region, equipment_required, instructions, is_rehabilitation: is_rehabilitation_str === 'true'
            });
        }
        
        console.log(`📊 Found ${exercises.length} exercises to insert.`);
        
        const batchSize = 50;
        let successCount = 0;
        
        for (let i = 0; i < exercises.length; i += batchSize) {
            const batch = exercises.slice(i, i + batchSize);
            const { data, error } = await supabase.from('exercises').insert(batch);
            if (error) {
                console.error(`❌ Error in batch ${Math.floor(i/batchSize) + 1}:`, error.message);
            } else {
                successCount += batch.length;
                console.log(`✅ Batch ${Math.floor(i/batchSize) + 1} uploaded (${successCount}/${exercises.length})`);
            }
        }
        
        console.log('\n🎉 Seeding complete!');
    } catch (err) {
        console.error('❌ Critical error:', err.message);
    }
}

runSeeding();
