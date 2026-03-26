const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
  'https://fbjlgepxbyoyradaacvd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg'
);

const EMAILS = [
  'test_clinic_admin@ishpo.com',
  'doctor3445@ishpo.com',
  'client3445@ishpo.com',
  'foe3445@ishpo.com',
];

const USERS = [
  { email: 'test_clinic_admin@ishpo.com', password: 'password123', role: 'admin',      firstName: 'Clinic',  lastName: 'Admin'      },
  { email: 'doctor3445@ishpo.com',        password: 'password123', role: 'consultant', firstName: 'Doctor',  lastName: 'Test'       },
  { email: 'client3445@ishpo.com',        password: 'password123', role: 'client',     firstName: 'Client',  lastName: 'Test'       },
  { email: 'foe3445@ishpo.com',           password: 'password123', role: 'foe',        firstName: 'FOE',     lastName: 'Test'       },
];

async function main() {
  console.log('Step 1: Find Test Clinic Fixed org...');
  const { data: orgs } = await sb.from('organizations').select('id, name');
  const org = (orgs || []).find(o => o.name.toLowerCase().includes('test clinic fixed'));
  if (!org) {
    console.error('Org not found. Available:', (orgs||[]).map(o=>o.name));
    return;
  }
  console.log('  Org:', org.name, '|', org.id);

  console.log('\nStep 2: Delete orphaned profiles blocking creation...');
  const { data: orphans } = await sb.from('profiles').select('id, email').in('email', EMAILS);
  console.log('  Found orphans:', (orphans||[]).length);
  for (const o of (orphans||[])) {
    await sb.from('user_roles').delete().eq('user_id', o.id);
    const r = await sb.from('profiles').delete().eq('id', o.id);
    console.log('  Deleted', o.email, r.error ? '❌ ' + r.error.message : '✅');
  }

  // Also try deleting by email directly in case id-based delete failed
  for (const email of EMAILS) {
    await sb.from('profiles').delete().eq('email', email);
  }

  // Also check/delete any lingering auth users
  const { data: { users: allUsers } } = await sb.auth.admin.listUsers();
  for (const email of EMAILS) {
    const existing = allUsers.find(u => u.email === email);
    if (existing) {
      await sb.auth.admin.deleteUser(existing.id);
      console.log('  Deleted existing auth user:', email);
    }
  }

  console.log('\nStep 3: Create new auth users and assign roles...');
  for (const u of USERS) {
    const { data: authData, error: createErr } = await sb.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { first_name: u.firstName, last_name: u.lastName },
    });

    if (createErr) {
      console.error('  FAILED to create', u.email, ':', createErr.message);
      continue;
    }

    const userId = authData.user.id;

    // Profile should be auto-created by trigger; update it
    await new Promise(res => setTimeout(res, 500)); // small wait for trigger
    const { error: profErr } = await sb.from('profiles').upsert({
      id: userId,
      email: u.email,
      first_name: u.firstName,
      last_name: u.lastName,
      organization_id: org.id,
      is_approved: true,
    }, { onConflict: 'id' });

    // Assign role
    const { error: roleErr } = await sb.from('user_roles').upsert({
      user_id: userId,
      role: u.role,
    }, { onConflict: 'user_id,role' });

    console.log(
      '  ✅', u.email,
      '| id=' + userId.substring(0, 8) + '...',
      '| profile:', profErr ? '❌ ' + profErr.message : 'OK',
      '| role:', roleErr ? '❌ ' + roleErr.message : u.role
    );
  }

  console.log('\nStep 4: Verification...');
  const { data: { users: finalUsers } } = await sb.auth.admin.listUsers();
  const { data: finalRoles } = await sb.from('user_roles').select('user_id, role');
  const { data: finalProfiles } = await sb.from('profiles').select('id, email, is_approved, organization_id');
  const roleMap = {};
  (finalRoles||[]).forEach(r => roleMap[r.user_id] = r.role);
  const profMap = {};
  (finalProfiles||[]).forEach(p => profMap[p.id] = p);

  for (const email of EMAILS) {
    const u = finalUsers.find(x => x.email === email);
    if (!u) { console.log('  ❌ MISSING:', email); continue; }
    const p = profMap[u.id] || {};
    const orgMatch = p.organization_id === org.id;
    console.log('  ✅', email, '| role=' + (roleMap[u.id]||'NONE'), '| approved=' + p.is_approved, '| correct_org=' + orgMatch);
  }
  console.log('\n===== DONE =====');
}

main().catch(console.error);
