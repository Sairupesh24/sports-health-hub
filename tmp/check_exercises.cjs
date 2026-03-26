const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkExercises() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
  
  console.log('--- Checking Exercises Table ---');
  const { data, error, count } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true });
    
  if (error) {
    console.error('Error fetching exercises:', error);
  } else {
    console.log('Total exercises count:', count);
  }

  const { data: sample, error: sampleError } = await supabase
    .from('exercises')
    .select('id, name, equipment_type')
    .limit(5);

  if (sampleError) {
    console.error('Error fetching sample:', sampleError);
  } else {
    console.log('Sample exercises:', sample);
  }
}

checkExercises();
