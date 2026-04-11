const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function run() {
  try {
    const env = fs.readFileSync('.env', 'utf8');
    const urlMatch = env.match(/VITE_SUPABASE_URL\s*=\s*"(.*?)"/);
    const keyMatch = env.match(/VITE_SUPABASE_SERVICE_ROLE_KEY\s*=\s*"(.*?)"/);

    if (!urlMatch || !keyMatch) {
      console.error('Could not find Supabase URL or Key in .env');
      return;
    }

    const url = urlMatch[1];
    const key = keyMatch[1];

    const supabase = createClient(url, key);

    console.log('Fixing TCF prefix for "Test Clinic Fixed"...');
    const { data, error } = await supabase
      .from('organizations')
      .update({ uhid_prefix: 'TCF' })
      .eq('name', 'Test Clinic Fixed')
      .is('uhid_prefix', null);

    if (error) {
      console.error('Error:', error.message);
    } else {
      console.log('Update successful!');
    }
    
  } catch (err) {
    console.error('Script Error:', err);
  }
}

run();
