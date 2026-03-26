// Fix handle_new_user trigger and create test users via pg direct connection
const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
  'https://fbjlgepxbyoyradaacvd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg'
);

const PG_URL = 'postgresql://postgres.fbjlgepxbyoyradaacvd:ISHPOSecure2024!@aws-0-ap-south-1.pooler.supabase.com:6543/postgres';

const TRIGGER_SQL = `
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
`;

const USERS = [
  { email: 'test_clinic_admin@ishpo.com', password: 'password123', role: 'admin',      firstName: 'Clinic', lastName: 'Admin' },
  { email: 'doctor3445@ishpo.com',        password: 'password123', role: 'consultant', firstName: 'Doctor', lastName: 'Test'  },
  { email: 'client3445@ishpo.com',        password: 'password123', role: 'client',     firstName: 'Client', lastName: 'Test'  },
  { email: 'foe3445@ishpo.com',           password: 'password123', role: 'foe',        firstName: 'FOE',    lastName: 'Test'  },
];

async function main() {
  // 1. Fix trigger via direct pg connection
  console.log('Step 1: Connect to Postgres and fix trigger...');
  const pgClient = new Client({ connectionString: PG_URL, ssl: { rejectUnauthorized: false } });
  try {
    await pgClient.connect();
    console.log('  Connected to Postgres.');
    await pgClient.query(TRIGGER_SQL);
    console.log('  ✅ handle_new_user trigger fixed successfully.');
    await pgClient.end();
  } catch (err) {
    console.log('  ⚠️  PG connection failed:', err.message);
    console.log('  Continuing anyway...');
    try { await pgClient.end(); } catch(e) {}
  }

  // 2. Get org
  const { data: orgs } = await sb.from('organizations').select('id, name');
  const org = (orgs || []).find(o => o.name.toLowerCase().includes('test clinic fixed'));
  if (!org) { console.error('Org "Test Clinic Fixed" not found!'); return; }
  console.log(`\nStep 2: Org = "${org.name}" (${org.id})`);

  // 3. Purge all existing @ishpo.com auth users and orphaned profiles
  const emails = USERS.map(u => u.email);
  const { data: { users: allUsers } } = await sb.auth.admin.listUsers();
  console.log('\nStep 3: Purge existing / orphaned data...');
  for (const email of emails) {
    const existing = allUsers.find(x => x.email === email);
    if (existing) {
      await sb.from('user_roles').delete().eq('user_id', existing.id);
      await sb.from('profiles').delete().eq('id', existing.id);
      const { error } = await sb.auth.admin.deleteUser(existing.id);
      console.log(`  Deleted auth user: ${email}`, error ? '❌ ' + error.message : '✅');
    }
    // Delete any orphaned profiles by email  
    await sb.from('profiles').delete().eq('email', email);
  }

  // 4. Create users
  console.log('\nStep 4: Create auth users...');
  const results = [];
  for (const u of USERS) {
    const { data: authData, error } = await sb.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { first_name: u.firstName, last_name: u.lastName },
    });

    if (error) {
      console.log(`  ❌ ${u.email}: ${error.message}`);
      results.push({ ...u, ok: false });
      continue;
    }

    const uid = authData.user.id;
    await new Promise(r => setTimeout(r, 500));

    // Update profile (created by trigger) with org + approved
    const { error: profErr } = await sb.from('profiles').upsert({
      id: uid,
      email: u.email,
      first_name: u.firstName,
      last_name: u.lastName,
      organization_id: org.id,
      is_approved: true,
    }, { onConflict: 'id' });

    // Add role
    const { error: roleErr } = await sb.from('user_roles').upsert({
      user_id: uid,
      role: u.role,
    }, { onConflict: 'user_id,role' });

    const ok = !profErr && !roleErr;
    console.log(`  ${ok ? '✅' : '⚠️ '} ${u.email} | role=${u.role}`, profErr ? '| profile:' + profErr.message : '', roleErr ? '| role:' + roleErr.message : '');
    results.push({ ...u, ok, uid });
  }

  console.log('\n===== CREDENTIALS SUMMARY =====');
  results.forEach(u => {
    const status = u.ok ? '✅' : '❌';
    console.log(`  ${status} [${u.role.padEnd(12)}]  ${u.email} / ${u.password}`);
  });
  console.log('=================================');
}

main().catch(console.error);
