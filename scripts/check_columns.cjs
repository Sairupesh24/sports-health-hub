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

    console.log('Checking organizations table columns...');
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Table Error:', error.message);
    } else if (data && data.length > 0) {
      console.log('Columns found:', Object.keys(data[0]));
    } else {
      console.log('No data in organizations table or table missing.');
    }
    
  } catch (err) {
    console.error('Script Error:', err);
  }
}

run();
