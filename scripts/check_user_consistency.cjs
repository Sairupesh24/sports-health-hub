const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkUserConsistency() {
  console.log('Checking User/Profile Consistency...');
  
  // We need to check auth.users too, but since we can't query auth.users via normal RPC usually, 
  // we'll check if there are profiles with no corresponding entries (this is hard without access to auth).
  // Wait, I have the service key! I can use auth.admin.listUsers()
  
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error('Auth check failed:', authError.message);
    return;
  }

  const { data: profiles, error: profileError } = await supabase.from('profiles').select('id, email, first_name, last_name, is_approved');
  if (profileError) {
    console.error('Profile check failed:', profileError.message);
    return;
  }

  const authIds = new Set(users.map(u => u.id));
  const profileIds = new Set(profiles.map(p => p.id));

  console.log(`Auth Users: ${authIds.size}`);
  console.log(`Profiles: ${profileIds.size}`);

  const missingFromAuth = profiles.filter(p => !authIds.has(p.id));
  const missingFromProfiles = users.filter(u => !profileIds.has(u.id));

  if (missingFromAuth.length > 0) {
    console.log('Profiles with NO Auth User (Orphaned Profiles):');
    missingFromAuth.forEach(p => console.log(`- ${p.first_name} ${p.last_name} (${p.email}) [ID: ${p.id}]`));
  }

  if (missingFromProfiles.length > 0) {
    console.log('Auth Users with NO Profile:');
    missingFromProfiles.forEach(u => console.log(`- ${u.email} [ID: ${u.id}]`));
  }
}

checkUserConsistency()
