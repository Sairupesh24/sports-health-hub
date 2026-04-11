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

    console.log('Fetching all organizations...');
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, uhid_prefix');

    if (error) {
      console.error('Error:', error.message);
    } else {
      console.log('Organizations:', JSON.stringify(data, null, 2));
    }
    
  } catch (err) {
    console.error('Script Error:', err);
  }
}

run();
