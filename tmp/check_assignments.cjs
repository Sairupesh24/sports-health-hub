const { createClient } = require('@supabase/supabase-js');
const URL = "https://fbjlgepxbyoyradaacvd.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg";
const supabase = createClient(URL, KEY);

async function checkLatestAssignment() {
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
            lift_items(*)
          )
        )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

checkLatestAssignment();
