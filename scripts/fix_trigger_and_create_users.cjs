const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const sb = createClient(
  'https://fbjlgepxbyoyradaacvd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg'
);

const USERS = [
  { email: 'test_clinic_admin@ishpo.com', password: 'password123', role: 'admin',      firstName: 'Clinic',  lastName: 'Admin'  },
  { email: 'doctor3445@ishpo.com',        password: 'password123', role: 'consultant', firstName: 'Doctor',  lastName: 'Test'   },
  { email: 'client3445@ishpo.com',        password: 'password123', role: 'client',     firstName: 'Client',  lastName: 'Test'   },
  { email: 'foe3445@ishpo.com',           password: 'password123', role: 'foe',        firstName: 'FOE',     lastName: 'Test'   },
];

async function main() {
  // Step 1: Apply the trigger fix via exec_sql_query RPC
  console.log('Step 1: Fixing handle_new_user trigger...');
  const sql = `
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
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
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  `;

  const { data: rpcData, error: rpcErr } = await sb.rpc('exec_sql_query', { query: sql });
  if (rpcErr) {
    console.log('  RPC exec failed (may need admin access):', rpcErr.message);
    console.log('  Continuing anyway — will try creating users directly...');
  } else {
    console.log('  Trigger fix applied successfully.');
  }

  // Step 2: Get org
  const { data: orgs } = await sb.from('organizations').select('id, name');
  const org = (orgs || []).find(o => o.name.toLowerCase().includes('test clinic fixed'));
  if (!org) { console.error('Org not found'); return; }
  console.log(`\nStep 2: Using org "${org.name}" (${org.id})`);

  // Step 3: Clean orphaned profiles
  console.log('\nStep 3: Clearing orphaned data...');
  const emails = USERS.map(u => u.email);
  const { data: { users: allAuthUsers } } = await sb.auth.admin.listUsers();

  for (const email of emails) {
    const existing = allAuthUsers.find(u => u.email === email);
    if (existing) {
      await sb.from('user_roles').delete().eq('user_id', existing.id);
      await sb.from('profiles').delete().eq('id', existing.id);
      await sb.auth.admin.deleteUser(existing.id);
      console.log('  Deleted existing auth user:', email);
    } else {
      // Delete any orphaned profile by email
      await sb.from('profiles').delete().eq('email', email);
    }
  }

  // Step 4: Create users
  console.log('\nStep 4: Creating users...');
  const results = [];
  for (const u of USERS) {
    const { data: authData, error: createErr } = await sb.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { first_name: u.firstName, last_name: u.lastName },
    });

    if (createErr) {
      console.log(`  ❌ ${u.email}: ${createErr.message}`);
      results.push({ ...u, success: false, error: createErr.message });
      continue;
    }

    const userId = authData.user.id;
    await new Promise(r => setTimeout(r, 300));

    // Update profile with org and approval
    await sb.from('profiles').upsert({
      id: userId,
      email: u.email,
      first_name: u.firstName,
      last_name: u.lastName,
      organization_id: org.id,
      is_approved: true,
    }, { onConflict: 'id' });

    // Add role
    await sb.from('user_roles').upsert({
      user_id: userId,
      role: u.role,
    }, { onConflict: 'user_id,role' });

    console.log(`  ✅ ${u.email} | role=${u.role} | id=${userId.substring(0,8)}...`);
    results.push({ ...u, success: true, userId });
  }

  console.log('\n===== CREDENTIALS SUMMARY =====');
  results.forEach(r => {
    if (r.success) {
      console.log(`  ✅ [${r.role.padEnd(12)}] ${r.email} / ${r.password}`);
    } else {
      console.log(`  ❌ [${r.role.padEnd(12)}] ${r.email} — FAILED: ${r.error}`);
    }
  });
}

main().catch(console.error);
