const { createClient } = require('@supabase/supabase-js');
const PROJECT_REF = 'fbjlgepxbyoyradaacvd';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';

const supabase = createClient(`https://${PROJECT_REF}.supabase.co`, SERVICE_KEY);

const TEST_USERS = [
  { email: 'test_clinic_admin@ishpo.com', role: 'admin',      firstName: 'Clinic', lastName: 'Admin' },
  { email: 'doctor3445@ishpo.com',        role: 'consultant', firstName: 'Doctor', lastName: 'Test'  },
  { email: 'client3445@ishpo.com',        role: 'client',     firstName: 'Client', lastName: 'Test'  },
  { email: 'foe3445@ishpo.com',           role: 'foe',        firstName: 'FOE',    lastName: 'Test'  },
];

async function repair() {
  console.log('--- Database Repair: Part 1 - Finding Test Organization ---');
  const { data: orgs } = await supabase.from('organizations').select('id, name');
  const org = (orgs || []).find(o => o.name.toLowerCase().includes('test clinic'));
  
  if (!org) {
    console.error('❌ FATAL: "Test Clinic" organization not found in DB.');
    process.exit(1);
  }
  console.log(`✅ Target Organization Found: "${org.name}" (${org.id})`);

  console.log('\n--- Database Repair: Part 2 - Syncing Auth Users & Profiles ---');
  const { data: { users: authUsers }, error: uError } = await supabase.auth.admin.listUsers();
  if (uError) {
    console.error('❌ Error listing users:', uError.message);
    process.exit(1);
  }

  for (const testUser of TEST_USERS) {
    const authUser = authUsers.find(u => u.email === testUser.email);
    
    if (!authUser) {
      console.log(`⚠️ User ${testUser.email} not found in Auth. Skipping.`);
      continue;
    }

    const authId = authUser.id;
    console.log(`\nProcessing: ${testUser.email} (Auth ID: ${authId})`);

    // 1. Clean up stale profiles (same email, different ID)
    const { data: staleProfiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', testUser.email)
      .neq('id', authId);
    
    if (staleProfiles && staleProfiles.length > 0) {
      console.log(`   Found ${staleProfiles.length} stale profile(s). Synchronizing...`);
      for (const stale of staleProfiles) {
        await supabase.from('user_roles').delete().eq('user_id', stale.id);
        await supabase.from('profiles').delete().eq('id', stale.id);
      }
    }

    // 2. Upsert correct profile
    const { error: pError } = await supabase
      .from('profiles')
      .upsert({
        id: authId,
        email: testUser.email,
        first_name: testUser.firstName,
        last_name: testUser.lastName,
        organization_id: org.id,
        is_approved: true,
      }, { onConflict: 'id' });

    if (pError) console.error(`   ❌ Profile Error: ${pError.message}`);
    else console.log(`   ✅ Profile linked & approved.`);

    // 3. Upsert correct role
    const { error: rError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: authId,
        role: testUser.role
      }, { onConflict: 'user_id,role' });

    if (rError) console.error(`   ❌ Role Error: ${rError.message}`);
    else console.log(`   ✅ Role assigned: ${testUser.role}`);
  }

  console.log('\n--- Database Repair: Part 3 - Verifying Final State ---');
  // Check specifically the admin
  const adminEmail = 'test_clinic_admin@ishpo.com';
  const { data: adminAuth } = await supabase.auth.admin.listUsers();
  const adminA = adminAuth.users.find(u => u.email === adminEmail);
  const { data: adminP } = await supabase.from('profiles').select('*').eq('email', adminEmail).maybeSingle();

  if (adminA && adminP && adminA.id === adminP.id) {
    console.log('🎉 REPAIR SUCCESSFUL: Admin Auth ID and Profile ID are synchronized.');
  } else {
    console.log('❌ REPAIR FAILED: Synchronization not achieved.');
  }
}

repair().catch(e => console.error('CRITICAL REPAIR ERROR:', e));
