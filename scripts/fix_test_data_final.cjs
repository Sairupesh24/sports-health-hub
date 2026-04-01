const { createClient } = require('@supabase/supabase-js');
const PROJECT_REF = 'fbjlgepxbyoyradaacvd';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';

const supabase = createClient(`https://${PROJECT_REF}.supabase.co`, SERVICE_KEY);

const TARGET_ORG_ID = '95d6393e-68ab-4839-9b35-a11562cfc150';
const TEST_USERS = [
  { email: 'test_clinic_admin@ishpo.com', role: 'clinic_admin', firstName: 'Clinic', lastName: 'Admin' },
  { email: 'doctor3445@ishpo.com',        role: 'consultant',   firstName: 'Doctor', lastName: 'Test'  },
  { email: 'client3445@ishpo.com',        role: 'client',       firstName: 'Client', lastName: 'Test'  },
];

async function repair() {
  console.log('Starting DB Repair for ISHPO Test Environment...');
  
  const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();

  for (const t of TEST_USERS) {
    const au = authUsers.find(u => u.email === t.email);
    if (!au) {
      console.log(`⚠️ User not found in Auth: ${t.email}`);
      continue;
    }

    console.log(`Syncing ${t.email} (Auth ID: ${au.id})`);

    // 1. Delete by email first (to handle email unique constraint issues with old IDs)
    await supabase.from('profiles').delete().eq('email', t.email);
    
    // 2. Delete by ID just in case
    await supabase.from('user_roles').delete().eq('user_id', au.id);
    await supabase.from('profiles').delete().eq('id', au.id);

    // 3. Fresh Insert
    const { error: pError } = await supabase.from('profiles').insert({
      id: au.id,
      email: t.email,
      first_name: t.firstName,
      last_name: t.lastName,
      organization_id: TARGET_ORG_ID,
      is_approved: true,
    });

    if (pError) {
       console.error(`  ❌ Profile Insert Error: ${pError.message}`);
    } else {
       console.log(`  ✅ Profile Synchronized.`);
    }

    // 4. Role Assignment
    await supabase.from('user_roles').insert({ user_id: au.id, role: t.role });
    if (t.role === 'clinic_admin') {
      await supabase.from('user_roles').insert({ user_id: au.id, role: 'admin' });
    }
    console.log(`  ✅ Roles Assigned: ${t.role}${t.role === 'clinic_admin' ? ', admin' : ''}`);
  }

  console.log('\n--- Final Verification Check ---');
  for (const t of TEST_USERS) {
    const { data } = await supabase.from('profiles').select('id, is_approved').eq('email', t.email).maybeSingle();
    console.log(`${t.email}: ${data ? 'PROFIL RECORD FOUND' : 'MISSING'} | Approved: ${data?.is_approved}`);
  }
}

repair().catch(console.error);
