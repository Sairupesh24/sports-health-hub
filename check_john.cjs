const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf-8');
let supabaseUrl = '';
let supabaseKey = '';

envContent.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*');
  console.log('--- PROFILES ---');
  console.log(profiles);

  const { data: clients, error: cErr } = await supabase.from('clients').select('*');
  console.log('\n--- CLIENTS ---');
  console.log(clients.filter(c => c.first_name === 'John' || c.uhid === 'CSH03260002'));
}
main();
