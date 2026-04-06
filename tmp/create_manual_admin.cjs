const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
  'https://fbjlgepxbyoyradaacvd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg'
);

const EMAIL = 'abhi79111@gmail.com';
const PASSWORD = 'Cssh@2024';
const ORG_ID = '02f1e999-4fe5-4d40-a9e2-e6f5472d18da';

async function createAdmin() {
  console.log('Step 1: Checking for existing user...');
  const { data: { users: allUsers } } = await sb.auth.admin.listUsers();
  const existingUser = allUsers.find(u => u.email === EMAIL);

  if (existingUser) {
    console.log('  Found existing user. Deleting to recreate...');
    await sb.from('user_roles').delete().eq('user_id', existingUser.id);
    await sb.from('profiles').delete().eq('id', existingUser.id);
    await sb.auth.admin.deleteUser(existingUser.id);
    console.log('  Deleted existing user.');
  }

  console.log('\nStep 2: Creating admin user...');
  const { data: authData, error: createErr } = await sb.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { first_name: 'Abhishek', last_name: 'Vadlakonda' }
  });

  if (createErr) {
    console.error('  ❌ Error creating user:', createErr.message);
    return;
  }

  const userId = authData.user.id;
  console.log(`  ✅ Auth user created: ${userId}`);

  // Wait a small bit for any triggers
  await new Promise(r => setTimeout(r, 500));

  console.log('\nStep 3: Updating profile and role...');
  
  // Upsert profile
  const { error: profileErr } = await sb.from('profiles').upsert({
    id: userId,
    email: EMAIL,
    first_name: 'Abhishek',
    last_name: 'Vadlakonda',
    organization_id: ORG_ID,
    is_approved: true
  });
  if (profileErr) console.error('  ❌ Profile update failed:', profileErr.message);
  else console.log('  ✅ Profile updated and approved.');

  // Assign admin role
  const { error: roleErr } = await sb.from('user_roles').upsert({
    user_id: userId,
    role: 'admin'
  });
  if (roleErr) console.error('  ❌ Role assignment failed:', roleErr.message);
  else console.log('  ✅ Admin role assigned.');

  console.log('\n===== DONE =====');
  console.log(`Email: ${EMAIL}`);
  console.log(`Password: ${PASSWORD}`);
  console.log(`Org ID: ${ORG_ID}`);
}

createAdmin().catch(console.error);
