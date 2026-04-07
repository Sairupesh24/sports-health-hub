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
  const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY);
  
  const keywords = ['trap', 'landmine', 'swiss', 'bosu', 'palloff'];
  
  for (const keyword of keywords) {
    const { data, error } = await supabase
      .from('exercises')
      .select('id, name')
      .ilike('name', `%${keyword}%`);
      
    if (error) {
      console.error(`Error for ${keyword}:`, error);
    } else {
      console.log(`Exercises matching "${keyword}":`, data.length);
      console.log(data.map(e => e.name));
    }
  }
}

checkExercises();
