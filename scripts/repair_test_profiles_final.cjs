const { createClient } = require('@supabase/supabase-js');
const PROJECT_REF = 'fbjlgepxbyoyradaacvd';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';

const supabase = createClient(`https://${PROJECT_REF}.supabase.co`, SERVICE_KEY);

const TARGET_ORG_ID = '95d6393e-68ab-4839-9b35-a11562cfc150'; // Center for Spine and Sports Health
const TEST_USERS = [
  { email: 'test_clinic_admin@ishpo.com', role: 'clinic_admin', firstName: 'Clinic', lastName: 'Admin' },
  { email: 'doctor3445@ishpo.com',        role: 'consultant',   firstName: 'Doctor', lastName: 'Test'  },
  { email: 'client3445@ishpo.com',        role: 'client',       firstName: 'Client', lastName: 'Test'  },
  { email: 'foe3445@ishpo.com',           role: 'foe',          firstName: 'FOE',    lastName: 'Test'  },
];

async function repair() {
  console.log(`--- Final Repair: Targeting Org ${TARGET_ORG_ID} ---`);
  
  const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();

  for (const t of TEST_USERS) {
    const au = authUsers.find(u => u.email === t.email);
    if (!au) {
      console.log(`⚠️ Skip: ${t.email}`);
      continue;
    }

    console.log(`Processing: ${t.email} -> ${au.id}`);

    // Update profile
    await supabase.from('profiles').upsert({
      id: au.id,
      email: t.email,
      first_name: t.firstName,
      last_name: t.lastName,
      organization_id: TARGET_ORG_ID,
      is_approved: true,
    }, { onConflict: 'id' });

    // Update role
    await supabase.from('user_roles').upsert({
      user_id: au.id,
      role: t.role
    }, { onConflict: 'user_id,role' });

    // Ensure they have 'admin' role if they are clinic_admin for simplicity in some filters
    if (t.role === 'clinic_admin') {
       await supabase.from('user_roles').upsert({ user_id: au.id, role: 'admin' }, { onConflict: 'user_id,role' });
    }
  }

  console.log('✅ Final Repair Complete.');
}

repair().catch(console.error);
