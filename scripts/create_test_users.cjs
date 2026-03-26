const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const USERS = [
  { email: 'test_clinic_admin@ishpo.com',  password: 'password123', role: 'admin',      firstName: 'Clinic',  lastName: 'Admin'      },
  { email: 'doctor3445@ishpo.com',         password: 'password123', role: 'consultant', firstName: 'Doctor',  lastName: 'Consultant' },
  { email: 'client3445@ishpo.com',         password: 'password123', role: 'client',     firstName: 'Test',    lastName: 'Client'     },
  { email: 'foe3445@ishpo.com',            password: 'password123', role: 'foe',        firstName: 'Front',   lastName: 'Officer'    },
];

async function createTestUsers() {
  console.log('===== CREATING TEST USERS IN TEST CLINIC FIXED =====\n');

  // Find the org
  const { data: orgs, error: orgErr } = await supabase
    .from('organizations')
    .select('id, name')
    .ilike('name', '%Test Clinic Fixed%');

  if (orgErr || !orgs || orgs.length === 0) {
    console.error('Could not find "Test Clinic Fixed" org:', orgErr?.message);
    console.log('Available orgs:');
    const { data: allOrgs } = await supabase.from('organizations').select('id, name');
    (allOrgs || []).forEach(o => console.log(`  - ${o.name} (${o.id})`));
    return;
  }

  const org = orgs[0];
  console.log(`Using org: "${org.name}" (${org.id})\n`);

  const { data: { users: existingUsers } } = await supabase.auth.admin.listUsers();

  for (const u of USERS) {
    console.log(`--- Processing: ${u.email} [${u.role}] ---`);

    // Delete existing if present (clean slate)
    const existing = existingUsers.find(eu => eu.email === u.email);
    if (existing) {
      await supabase.from('user_roles').delete().eq('user_id', existing.id);
      await supabase.from('profiles').delete().eq('id', existing.id);
      await supabase.auth.admin.deleteUser(existing.id);
      console.log(`  Removed existing user.`);
    }

    // Create auth user
    const { data: authData, error: createErr } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { first_name: u.firstName, last_name: u.lastName },
    });

    if (createErr) {
      console.error(`  FAILED to create auth user: ${createErr.message}`);
      continue;
    }

    const userId = authData.user.id;
    console.log(`  Created auth user: ${userId}`);

    // Upsert profile
    const { error: profErr } = await supabase.from('profiles').upsert({
      id: userId,
      email: u.email,
      first_name: u.firstName,
      last_name: u.lastName,
      organization_id: org.id,
      is_approved: true,   // pre-approved so they skip the pending page
      role: u.role,
    }, { onConflict: 'id' });

    if (profErr) console.log(`  Profile warning: ${profErr.message}`);
    else console.log(`  Profile created (is_approved=true).`);

    // Assign role
    const { error: roleErr } = await supabase.from('user_roles').insert({
      user_id: userId,
      role: u.role,
    });

    if (roleErr) console.log(`  Role warning: ${roleErr.message}`);
    else console.log(`  Role assigned: ${u.role}`);

    console.log(`  ✅ Done: ${u.email} / ${u.password}\n`);
  }

  console.log('\n===== SUMMARY =====');
  USERS.forEach(u => console.log(`  ${u.role.padEnd(12)} | ${u.email} / ${u.password}`));
  console.log('\n===== COMPLETE =====');
}

createTestUsers().catch(console.error);
