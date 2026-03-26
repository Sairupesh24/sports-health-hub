// Fix trigger via Supabase Management API SQL endpoint
const https = require('https');
const { createClient } = require('@supabase/supabase-js');

const PROJECT_REF = 'fbjlgepxbyoyradaacvd';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';
const sb = createClient(`https://${PROJECT_REF}.supabase.co`, SERVICE_KEY);

// The Supabase /rest/v1/sql endpoint for running raw SQL
async function execSQL(sql) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query: sql });
    const options = {
      hostname: `${PROJECT_REF}.supabase.co`,
      path: '/rest/v1/sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
      },
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

const TRIGGER_SQL = `
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id, NEW.email,
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
  console.log('Step 1: Attempt trigger fix via /rest/v1/sql...');
  const result = await execSQL(TRIGGER_SQL);
  console.log(`  SQL Result: HTTP ${result.status} | ${result.body.substring(0, 150)}`);

  console.log('\nStep 2: Test user creation after fix attempt...');
  const testResult = await sb.auth.admin.createUser({
    email: `_diag_${Date.now()}@ishpo.com`, password: 'password123', email_confirm: true
  });
  if (testResult.error) {
    console.log('  Still failing:', testResult.error.message);
    console.log('\n  ⚠️  The trigger cannot be fixed from outside. Applying a WORKAROUND...');
    console.log('  Strategy: Insert profiles manually then create auth users one by one via signUp API.\n');
  } else {
    console.log('  ✅ User creation now works! Cleaning up test user...');
    await sb.auth.admin.deleteUser(testResult.data.user.id);
  }

  // Get org
  const { data: orgs } = await sb.from('organizations').select('id, name');
  const org = (orgs || []).find(o => o.name.toLowerCase().includes('test clinic fixed'));
  if (!org) { console.error('Org not found!'); return; }
  console.log(`Org: "${org.name}" (${org.id})`);

  // Purge existing 
  const { data: { users: allUsers } } = await sb.auth.admin.listUsers();
  for (const email of USERS.map(u => u.email)) {
    const ex = allUsers.find(u => u.email === email);
    if (ex) {
      await sb.from('user_roles').delete().eq('user_id', ex.id);
      await sb.from('profiles').delete().eq('id', ex.id);
      await sb.auth.admin.deleteUser(ex.id);
    }
    await sb.from('profiles').delete().eq('email', email);
  }
  console.log('Existing data purged.');

  // Create users  
  for (const u of USERS) {
    const { data, error } = await sb.auth.admin.createUser({
      email: u.email, password: u.password, email_confirm: true,
      user_metadata: { first_name: u.firstName, last_name: u.lastName },
    });
    if (error) { console.log(`  ❌ ${u.email}: ${error.message}`); continue; }
    
    const uid = data.user.id;
    await new Promise(r => setTimeout(r, 500));
    await sb.from('profiles').upsert({
      id: uid, email: u.email, first_name: u.firstName, last_name: u.lastName,
      organization_id: org.id, is_approved: true,
    }, { onConflict: 'id' });
    await sb.from('user_roles').upsert({ user_id: uid, role: u.role }, { onConflict: 'user_id,role' });
    console.log(`  ✅ Created: ${u.email} | ${u.role}`);
  }

  // Final status
  const { data: { users: finalUsers } } = await sb.auth.admin.listUsers();
  console.log('\n===== FINAL STATUS =====');
  USERS.forEach(u => {
    const found = finalUsers.find(x => x.email === u.email);
    console.log(`  ${found ? '✅' : '❌'} [${u.role.padEnd(12)}] ${u.email} / ${u.password}`);
  });
}

main().catch(console.error);
