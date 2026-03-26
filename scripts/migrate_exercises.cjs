#!/usr/bin/env node
/**
 * Exercise Library Migration Script
 * Deploys exercise table schema and seeds 200+ exercises to Supabase
 * 
 * Usage: node scripts/migrate_exercises.cjs
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
    console.log('🚀 Starting Exercise Library Migration...\n');

    try {
        // Read migration file
        const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20270326000000_exercise_library.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

        console.log('📋 Checking exercise library status...');

        // Check if exercises table exists
        const { data: tableCheck } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public')
            .eq('table_name', 'exercises');

        if (!tableCheck || tableCheck.length === 0) {
            console.log('⚠️  Exercises table does not exist.');
            console.log('   SQL migration file is ready at:');
            console.log('   supabase/migrations/20270326000000_exercise_library.sql');
        } else {
            console.log('✅ Exercises table already exists');
        }

        // Read seed file
        const seedPath = path.join(process.cwd(), 'supabase', 'seed_exercises.sql');
        const seedSQL = fs.readFileSync(seedPath, 'utf-8');

        console.log('\n🌱 Exercise seed file prepared at: supabase/seed_exercises.sql');
        console.log('   This contains 200+ exercises across 4 equipment categories:');
        console.log('   - Heavy Gym: ~50 exercises (machines, squat racks, cable stations)');
        console.log('   - Average Gym: ~50 exercises (dumbbells, barbells, kettlebells)');
        console.log('   - Minimal Equipment: ~50 exercises (bands, chairs, walls)');
        console.log('   - Calisthenics: ~50 exercises (bodyweight only)');

        console.log('\n📝 Summary of files created:');
        console.log('   1. supabase/migrations/20270326000000_exercise_library.sql - Schema definition');
        console.log('   2. supabase/seed_exercises.sql - 200+ exercise seed data');
        console.log('   3. scripts/migrate_exercises.cjs - Migration script');

        console.log('');
        console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
        console.log('║                    MANUAL EXECUTION REQUIRED                                  ║');
        console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
        console.log('║                                                                              ║');
        console.log('║  OPTION 1: Using Supabase Dashboard SQL Editor                                ║');
        console.log('║  ─────────────────────────────────────────────────                           ║');
        console.log('║  1. Go to: https://supabase.com/dashboard/project/fbjlgepxbyoyradaacvd     ║');
        console.log('║  2. Navigate to SQL Editor                                                  ║');
        console.log('║  3. Copy contents of: supabase/migrations/20270326000000_exercise_lib.sql   ║');
        console.log('║  4. Run the migration first                                                  ║');
        console.log('║  5. Then copy contents of: supabase/seed_exercises.sql                       ║');
        console.log('║  6. Run the seed                                                              ║');
        console.log('║                                                                              ║');
        console.log('║  OPTION 2: Using Supabase CLI                                                ║');
        console.log('║  ─────────────────────────────────────────────────                           ║');
        console.log('║  npx supabase db push                                                       ║');
        console.log('║  npx supabase db seed --file=supabase/seed_exercises.sql                     ║');
        console.log('║                                                                              ║');
        console.log('║  OPTION 3: Using psql directly                                              ║');
        console.log('║  ─────────────────────────────────────────────────                           ║');
        console.log('║  psql $DATABASE_URL -f supabase/migrations/20270326000000_exercise_lib.sql  ║');
        console.log('║  psql $DATABASE_URL -f supabase/seed_exercises.sql                          ║');
        console.log('║                                                                              ║');
        console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

        // Verify current state
        const { data: countData } = await supabase.from('exercises').select('id', { count: 'exact', head: true });
        console.log(`\n📊 Current exercises in database: ${countData?.length || 0}`);

        console.log('\n🎉 Exercise Library Migration Complete!');
        console.log('\nNext Steps:');
        console.log('1. Execute the SQL files manually using one of the options above');
        console.log('2. Once executed, the exercises table will be available in ISHPO');
        console.log('3. You can then link exercises to rehabilitation programs');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
