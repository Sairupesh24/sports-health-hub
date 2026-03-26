const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function getEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
      console.error('No .env file found at:', envPath);
      process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split('\n');
  const env = {};
  lines.forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim().replace(/^"(.*)"$/, '$1');
      env[key] = value;
    }
  });
  return env;
}

async function checkExercises() {
  const env = getEnv();
  const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
  
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
