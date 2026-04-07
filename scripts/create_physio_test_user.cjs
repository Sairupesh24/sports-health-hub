const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
  'https://fbjlgepxbyoyradaacvd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg'
);

const EMAIL = 'physio_test@ishpo.com';
const PASSWORD = 'password123';
const ROLE = 'physiotherapist';
const FIRST_NAME = 'Physio';
const LAST_NAME = 'Test';

async function main() {
  console.log('Step 1: Find Test Clinic Fixed org...');
  const { data: orgs } = await sb.from('organizations').select('id, name');
  const org = (orgs || []).find(o => o.name.toLowerCase().includes('test clinic fixed'));
  if (!org) {
    console.error('Org not found. Available:', (orgs||[]).map(o=>o.name));
    return;
  }
  console.log('  Org:', org.name, '|', org.id);

  console.log('\nStep 2: Cleaning up existing user...');
  const { data: { users: allUsers } } = await sb.auth.admin.listUsers();
  const existing = allUsers.find(u => u.email === EMAIL);
  if (existing) {
    await sb.from('user_roles').delete().eq('user_id', existing.id);
    await sb.from('profiles').delete().eq('id', existing.id);
    await sb.auth.admin.deleteUser(existing.id);
    console.log('  Deleted existing user:', EMAIL);
  }

  console.log('\nStep 3: Creating physio user...');
  const { data: authData, error: createErr } = await sb.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { first_name: FIRST_NAME, last_name: LAST_NAME },
  });

  if (createErr) {
    console.error('  FAILED to create', EMAIL, ':', createErr.message);
    return;
  }

  const userId = authData.user.id;
  console.log('  User created with ID:', userId);

  // Profile should be auto-created by trigger; update it
  console.log('  Updating profile and assigning role...');
  await new Promise(res => setTimeout(res, 1000)); // wait for trigger
  
  const { error: profErr } = await sb.from('profiles').upsert({
    id: userId,
    email: EMAIL,
    first_name: FIRST_NAME,
    last_name: LAST_NAME,
    organization_id: org.id,
    is_approved: true,
    profession: 'Physiotherapist'
  }, { onConflict: 'id' });

  if (profErr) {
    console.error('  FAILED to update profile:', profErr.message);
  }

  const { error: roleErr } = await sb.from('user_roles').upsert({
    user_id: userId,
    role: ROLE,
  }, { onConflict: 'user_id,role' });

  if (roleErr) {
    console.error('  FAILED to assign role:', roleErr.message);
  }

  console.log('  ✅ Physio user setup completed.');
  console.log('  Email:', EMAIL);
  console.log('  Password:', PASSWORD);
  console.log('\n===== DONE =====');
}

main().catch(console.error);
