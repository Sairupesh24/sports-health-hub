const { createClient } = require('@supabase/supabase-js');
const sb = createClient('https://fbjlgepxbyoyradaacvd.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg');

async function checkMissingUser() {
  const email = 'doctor3445@ishpo.com';
  
  // 1. Check the profile for the doctor
  const { data: profile, error } = await sb
    .from('profiles')
    .select('id, email, organization_id, is_approved')
    .eq('email', email)
    .single();

  if (error) {
    console.error(`Error finding profile for ${email}:`, error.message);
  } else {
    console.log(`Doctor Profile: Email=${profile.email}, OrgID=${profile.organization_id}, Approved=${profile.is_approved}`);
  }

  // 2. Check the role
  const { data: roleData } = await sb
    .from('user_roles')
    .select('role')
    .eq('user_id', profile?.id)
    .single();
  
  console.log(`Doctor Role: ${roleData?.role || 'NONE'}`);

  // 3. Find the admin looking at the screen (let's check who the admin for this org is)
  // Or just list all admins and their orgs
  const { data: admins } = await sb
    .from('user_roles')
    .select('user_id, profiles!inner(email, organization_id)')
    .eq('role', 'admin');
  
  console.log('\nExisting Admins:');
  admins.forEach(a => console.log(`  - ${a.profiles.email} | OrgID: ${a.profiles.organization_id}`));
}

checkMissingUser();
