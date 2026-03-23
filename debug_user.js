import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://fbjlgepxbyoyradaacvd.supabase.co";
const supabaseServiceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg";

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function run() {
  try {
    const email = 'scientist_test@example.com';
    
    // Get user ID
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const user = authUsers.users.find(u => u.email === email);
    
    if (!user) {
      console.log('User not found in Auth');
      return;
    }

    console.log('--- Auth User ---');
    console.log('ID:', user.id);
    console.log('Email:', user.email);

    // Get profile
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    console.log('\n--- Profile ---');
    console.log(JSON.stringify(profile, null, 2));

    // Get roles
    const { data: roles } = await supabase.from('user_roles').select('*').eq('user_id', user.id);
    console.log('\n--- Roles ---');
    console.log(JSON.stringify(roles, null, 2));

    // Get all orgs
    const { data: orgs } = await supabase.from('organizations').select('id, name, join_code');
    console.log('\n--- Organizations ---');
    console.log(JSON.stringify(orgs, null, 2));

  } catch (err) {
    console.error('Error:', err.message);
  }
}

run();
