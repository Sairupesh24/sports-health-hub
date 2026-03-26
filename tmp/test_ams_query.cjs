const { createClient } = require('@supabase/supabase-js');

const URL = "https://fbjlgepxbyoyradaacvd.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg";

const supabase = createClient(URL, KEY);

async function testQuery() {
  const { data, error } = await supabase
    .from('program_assignments')
    .select(`
      *,
      program:training_programs(
        *,
        days:workout_days(
          *,
          items:workout_items(
            *,
            lift_items(
              *,
              exercise:exercises(name)
            )
          )
        )
      )
    `)
    .limit(1);

  if (error) {
    console.error('Query failed:', error);
  } else {
    console.log('Query succeeded. Data:', JSON.stringify(data?.[0]?.program?.days?.[0]?.items, null, 2));
  }
}

testQuery();
