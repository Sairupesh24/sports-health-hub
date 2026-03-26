const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const SUPABASE_URL = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

// Execute raw SQL via the Supabase REST postgres endpoint
function runSQL(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const url = new URL(SUPABASE_URL + '/rest/v1/rpc/exec_sql_query');
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
        'Content-Length': Buffer.byteLength(body),
      }
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const USERS = [
  { email: 'test_clinic_admin@ishpo.com', password: 'password123', role: 'admin',      firstName: 'Clinic',  lastName: 'Admin'  },
  { email: 'doctor3445@ishpo.com',        password: 'password123', role: 'consultant', firstName: 'Doctor',  lastName: 'Test'   },
  { email: 'client3445@ishpo.com',        password: 'password123', role: 'client',     firstName: 'Client',  lastName: 'Test'   },
  { email: 'foe3445@ishpo.com',           password: 'password123', role: 'foe',        firstName: 'FOE',     lastName: 'Test'   },
];

async function main() {
  // 1. Try to fix trigger via exec_sql_query
  console.log('Step 1: Fix handle_new_user trigger...');
  const triggerSQL = `
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
    AS $func$
    BEGIN
      INSERT INTO public.profiles (id, email, first_name, last_name)
      VALUES (NEW.id, NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name',''),
        COALESCE(NEW.raw_user_meta_data->>'last_name',''))
      ON CONFLICT (id) DO NOTHING;
      RETURN NEW;
    END;
    $func$;
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  `;

  const r = await runSQL(triggerSQL);
  console.log('  Result:', r.status, r.body.substring(0, 200));

  // 2. Get org
  const { data: orgs } = await sb.from('organizations').select('id, name');
  const org = (orgs || []).find(o => o.name.toLowerCase().includes('test clinic fixed'));
  if (!org) { console.error('Org not found!'); return; }
  console.log(`\nStep 2: Org = "${org.name}" (${org.id})`);

  // 3. Purge orphaned data
  const { data: { users: allUsers } } = await sb.auth.admin.listUsers();
  for (const u of USERS) {
    const existing = allUsers.find(x => x.email === u.email);
    if (existing) {
      await sb.from('user_roles').delete().eq('user_id', existing.id);
      await sb.from('profiles').delete().eq('id', existing.id);
      const { error } = await sb.auth.admin.deleteUser(existing.id);
      console.log(`  Purged: ${u.email}`, error ? '❌ ' + error.message : '✅');
    }
    await sb.from('profiles').delete().eq('email', u.email);
  }

  // 4. Create users
  console.log('\nStep 3: Create users...');
  for (const u of USERS) {
    const { data, error } = await sb.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { first_name: u.firstName, last_name: u.lastName },
    });

    if (error) {
      console.log(`  ❌ ${u.email}: ${error.message}`);
      continue;
    }

    const uid = data.user.id;
    await new Promise(r => setTimeout(r, 400));

    await sb.from('profiles').upsert({
      id: uid, email: u.email, first_name: u.firstName, last_name: u.lastName,
      organization_id: org.id, is_approved: true,
    }, { onConflict: 'id' });

    await sb.from('user_roles').upsert({ user_id: uid, role: u.role }, { onConflict: 'user_id,role' });
    console.log(`  ✅ ${u.email} | role=${u.role}`);
  }

  // 5. Print summary
  console.log('\n===== TEST CLINIC FIXED CREDENTIALS =====');
  USERS.forEach(u => console.log(`  [${u.role.padEnd(12)}] ${u.email} / ${u.password}`));
  console.log('=========================================');
}

main().catch(console.error);
