const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixRoles() {
  console.log('Fixing Roles for Dr. Smith...');
  
  const email = 'test_dr._smith@ishpo.com';
  const { data: profile } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
  
  if (!profile) {
    console.error('Dr. Smith profile not found');
    return;
  }

  console.log(`Found ID: ${profile.id}. Updating user_roles...`);

  // We add 'sports_scientist' role. (Upsert might replace, but we want to be sure)
  const { error } = await supabase.from('user_roles').upsert({
    user_id: profile.id,
    role: 'sports_scientist'
  });

  if (error) {
    console.error('Role update failed:', error.message);
  } else {
    console.log('Role updated to sports_scientist successfully!');
  }
}

fixRoles()
