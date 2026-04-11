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

    console.log('Fetching super_admin IDs...');
    const { data: roles, error: rolesErr } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'super_admin');

    if (rolesErr) {
      console.error('Error fetching roles:', rolesErr.message);
      return;
    }

    if (!roles || roles.length === 0) {
      console.log('No super_admin found.');
      return;
    }

    const userIds = roles.map(r => r.user_id);
    console.log('Super Admin IDs:', userIds);

    console.log('Fetching emails from profiles...');
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', userIds);

    if (profErr) {
      console.error('Error fetching profiles:', profErr.message);
    } else {
      console.log('Super Admin Profiles:', JSON.stringify(profiles, null, 2));
    }
    
  } catch (err) {
    console.error('Script Error:', err);
  }
}

run();
