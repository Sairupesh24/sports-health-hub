const { createClient } = require('@supabase/supabase-js');

const URL = "https://fbjlgepxbyoyradaacvd.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg";

const supabase = createClient(URL, KEY);

async function checkMigrationHistory() {
  console.log('Checking migration history...');
  
  // Supabase stores migrations in supabase_migrations.schema_migrations or similar
  // but often we can't query them from outside without special permissions or RPC.
  // Instead, let's just check for the tables again with select('*') limit 0.
  
  const tables = [
    'exercises',
    'training_programs',
    'program_assignments',
    'workout_days'
  ];

  for (const t of tables) {
    const { error } = await supabase.from(t).select('*').limit(0);
    if (error) {
      console.log(`Table '${t}': [MISSING] (${error.code}: ${error.message})`);
    } else {
      console.log(`Table '${t}': [EXISTS]`);
    }
  }
}

checkMigrationHistory();
