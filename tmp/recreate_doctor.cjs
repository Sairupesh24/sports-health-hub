const { createClient } = require('@supabase/supabase-js');
const sb = createClient('https://fbjlgepxbyoyradaacvd.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg');

async function createUser() {
  const email = 'doctor3445@ishpo.com';
  const password = 'password123';
  const role = 'sports_physician';
  const orgId = '02f1e999-4fe5-4d40-a9e2-e6f5472d18da'; // Center for Spine and Sports Health

  console.log(`Recreating user: ${email}...`);

  // 1. Create Auth User
  const { data: authData, error: authErr } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: 'Doctor', last_name: 'Test' }
  });

  if (authErr) {
     console.error('Error creating auth user:', authErr.message);
     return;
  }
  
  const userId = authData.user.id;
  console.log(`  Auth user created with ID: ${userId}`);

  // 2. Upsert Profile
  const { error: profileErr } = await sb.from('profiles').upsert({
    id: userId,
    email,
    first_name: 'Doctor',
    last_name: 'Test',
    organization_id: orgId,
    is_approved: true
  }, { onConflict: 'id' });

  if (profileErr) {
    console.error('Error creating profile:', profileErr.message);
  } else {
    console.log('  Profile created and approved.');
  }

  // 3. Add Role
  const { error: roleErr } = await sb.from('user_roles').upsert({
    user_id: userId,
    role: role
  }, { onConflict: 'user_id,role' });

  if (roleErr) {
    console.error('Error adding role:', roleErr.message);
  } else {
    console.log(`  Role "${role}" assigned successfully.`);
  }

  console.log('\nUser recreation successfully completed.');
}

createUser();
