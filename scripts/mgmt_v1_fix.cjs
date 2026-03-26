// Use Supabase Management API v1 to run SQL as superuser
const https = require('https');
const { createClient } = require('@supabase/supabase-js');

const PROJECT_REF = 'fbjlgepxbyoyradaacvd';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';

const sb = createClient(`https://${PROJECT_REF}.supabase.co`, SERVICE_KEY);

function post(hostname, path, data, token) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const req = https.request({
      hostname, path, method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': token,
        'Content-Length': Buffer.byteLength(body),
      }
    }, res => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => resolve({ status: res.statusCode, body: b }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const TRIGGER_SQL = `
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name',''),
    COALESCE(NEW.raw_user_meta_data->>'last_name',''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
`;

const USERS = [
  { email: 'test_clinic_admin@ishpo.com', password: 'password123', role: 'admin',      firstName: 'Clinic', lastName: 'Admin' },
  { email: 'doctor3445@ishpo.com',        password: 'password123', role: 'consultant', firstName: 'Doctor', lastName: 'Test'  },
  { email: 'client3445@ishpo.com',        password: 'password123', role: 'client',     firstName: 'Client', lastName: 'Test'  },
  { email: 'foe3445@ishpo.com',           password: 'password123', role: 'foe',        firstName: 'FOE',    lastName: 'Test'  },
];

async function main() {
  // Try multiple SQL endpoints
  const endpoints = [
    { hostname: 'api.supabase.com', path: `/v1/projects/${PROJECT_REF}/database/query` },
    { hostname: `${PROJECT_REF}.supabase.co`, path: '/rest/v1/rpc/exec_sql_query' },
  ];

  console.log('Step 1: Try to fix trigger via Management API...');
  for (const ep of endpoints) {
    const r = await post(ep.hostname, ep.path, { query: TRIGGER_SQL }, SERVICE_KEY);
    console.log(`  ${ep.hostname}${ep.path}: HTTP ${r.status} | ${r.body.substring(0, 100)}`);
    if (r.status === 201 || r.status === 200) { console.log('  ✅ SQL applied!'); break; }
  }

  // Test if creation works now
  const probe = await sb.auth.admin.createUser({ 
    email: `probe_${Date.now()}@ishpo.com`, password: 'test123', email_confirm: true 
  });
  if (probe.error) {
    console.log('\n❌ Auth creation still fails:', probe.error.message);
    console.log('→ Trigger is still broken. User needs to fix it manually in Supabase dashboard.');
    console.log('→ Go to: https://supabase.com/dashboard/project/' + PROJECT_REF + '/database/triggers');
    console.log('→ Or SQL editor: https://supabase.com/dashboard/project/' + PROJECT_REF + '/sql/new');
    console.log('\nSQL to run in the dashboard:\n');
    console.log(TRIGGER_SQL);
    return;
  }
  console.log('\n✅ Creation works! Cleaning up probe user...');
  await sb.auth.admin.deleteUser(probe.data.user.id);

  // Get org
  const { data: orgs } = await sb.from('organizations').select('id,name');
  const org = (orgs||[]).find(o => o.name.toLowerCase().includes('test clinic fixed'));
  if (!org) { console.error('Org not found!'); return; }
  console.log(`Org: "${org.name}" (${org.id})`);

  // Purge and create
  const { data: { users: allUsers } } = await sb.auth.admin.listUsers();
  for (const u of USERS) {
    await sb.from('profiles').delete().eq('email', u.email);
    const ex = allUsers.find(x => x.email === u.email);
    if (ex) { await sb.from('user_roles').delete().eq('user_id',ex.id); await sb.auth.admin.deleteUser(ex.id); }
  }

  for (const u of USERS) {
    const { data, error } = await sb.auth.admin.createUser({
      email: u.email, password: u.password, email_confirm: true,
      user_metadata: { first_name: u.firstName, last_name: u.lastName },
    });
    if (error) { console.log(`❌ ${u.email}: ${error.message}`); continue; }
    const uid = data.user.id;
    await new Promise(r => setTimeout(r,500));
    await sb.from('profiles').upsert({ id:uid, email:u.email, first_name:u.firstName, last_name:u.lastName, organization_id:org.id, is_approved:true }, {onConflict:'id'});
    await sb.from('user_roles').upsert({ user_id:uid, role:u.role }, {onConflict:'user_id,role'});
    console.log(`✅ ${u.email} | ${u.role}`);
  }
  console.log('\n=== CREDENTIALS ===');
  USERS.forEach(u => console.log(`[${u.role.padEnd(12)}] ${u.email} / ${u.password}`));
}

main().catch(console.error);
