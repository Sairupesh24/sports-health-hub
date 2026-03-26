const { createClient } = require('@supabase/supabase-js');

const URL = "https://fbjlgepxbyoyradaacvd.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg";

const supabase = createClient(URL, KEY);

async function listAllTables() {
  console.log('Querying all tables in public schema via SQL-like query...');
  
  // Since we don't have a direct SQL executor, we'll try to use the REST API on information_schema if enabled
  // Actually, Supabase REST API doesn't usually expose information_schema.
  // BUT, we can use the 'select count' trick on many names to find it.
  
  // Let's try to query 'profiles' and see if it works with select *
  const { data: pData, error: pError } = await supabase.from('profiles').select('*').limit(1);
  console.log('Testing profiles select *:', pError ? pError.message : 'SUCCESS');

  // Let's try to search for tables by guessing common names
  const guesses = [
    'training_programs',
    'training_program',
    'programs',
    'program',
    'workout_plans',
    'ams_programs'
  ];

  for (const t of guesses) {
    const { error } = await supabase.from(t).select('count', { count: 'exact', head: true });
    if (!error) {
      console.log(`FOUND TABLE: ${t}`);
    }
  }
}

listAllTables();
