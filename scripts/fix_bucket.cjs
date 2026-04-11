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

    console.log('Connecting to:', url);
    const supabase = createClient(url, key);

    console.log('Creating bucket "clinic-logos"...');
    const { data, error } = await supabase.storage.createBucket('clinic-logos', {
      public: true
    });

    if (error) {
      console.error('Bucket Error:', error.message);
    } else {
      console.log('Bucket created successfully!');
    }

    // Also try to run the SQL to add columns if they are missing
    // Note: We can't run arbitrary SQL via supabase-js easily unless we have a function or use a specific library
    // But we CAN check if the columns exist or try to update a test org
    
  } catch (err) {
    console.error('Script Error:', err);
  }
}

run();
