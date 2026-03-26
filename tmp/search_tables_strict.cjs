const { createClient } = require('@supabase/supabase-js');

const URL = "https://fbjlgepxbyoyradaacvd.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg";

const supabase = createClient(URL, KEY);

async function listAllTables() {
  console.log('Querying potential table names with strict error checking...');
  
  const guesses = [
    'training_programs',
    'training_program',
    'programs',
    'program',
    'workout_plans',
    'ams_programs',
    'training_sessions',
    'profiles'
  ];

  for (const t of guesses) {
    const { error } = await supabase.from(t).select('*', { head: true });
    if (error) {
      console.log(`Table '${t}': [NOT FOUND] (${error.code}: ${error.message})`);
    } else {
      console.log(`Table '${t}': [FOUND]`);
    }
  }
}

listAllTables();
