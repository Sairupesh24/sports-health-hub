const { createClient } = require('@supabase/supabase-js');

const URL = "https://fbjlgepxbyoyradaacvd.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NDM5ODUsImV4cCI6MjA4ODAxOTk4NX0.78A6t7i9ySqe5fR3EyHnrWq_MK-b0w70MpouMXdHkzM";

const supabase = createClient(URL, KEY);

async function checkTables() {
  console.log('Verifying AMS v2 tables visibility as ANON...');
  
  const tables = [
    'training_programs', 
    'program_assignments',
    'workout_days', 
    'workout_items', 
    'lift_items', 
    'exercises',
    'exercise_categories'
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
    if (error) {
      console.log(`Table ${table}: [ERROR] ${error.message}`);
    } else {
      console.log(`Table ${table}: [VISIBLE]`);
    }
  }
}

checkTables();
