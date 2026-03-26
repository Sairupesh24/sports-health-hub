const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkTables() {
  console.log('Listing all tables in public schema...');
  
  // Method 1: Try to query common AMS tables
  const tables = [
    'training_programs', 
    'workout_days', 
    'workout_items', 
    'lift_items', 
    'program_assignments',
    'exercises'
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`Table ${table}: MISSING or ERROR (${error.message})`);
    } else {
      console.log(`Table ${table} EXISTS`);
    }
  }
}

checkTables();
