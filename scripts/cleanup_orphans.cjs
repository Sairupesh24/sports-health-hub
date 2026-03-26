const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function cleanupOrphans() {
  console.log('Cleaning up orphaned profiles...');
  
  // 1. Get all real user IDs
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('List failed:', error.message);
    return;
  }
  const realIds = new Set(users.map(u => u.id));

  // 2. Find profiles NOT in realIds
  const { data: profiles } = await supabase.from('profiles').select('id, email, first_name, last_name');
  const orphans = profiles.filter(p => !realIds.has(p.id));

  console.log(`Found ${orphans.length} orphans.`);
  
  if (orphans.length > 0) {
    for (const orphan of orphans) {
      console.log(`- Deleting orphan: ${orphan.first_name} ${orphan.last_name} (${orphan.email}) [ID: ${orphan.id}]`);
      
      // Delete from profiles (this might fail if there are dependent records in performance_assessments)
      // I should first delete dependent records.
      
      await supabase.from('performance_assessments').delete().eq('athlete_id', orphan.id);
      await supabase.from('performance_assessments').delete().eq('recorded_by', orphan.id);
      await supabase.from('wellness_logs').delete().eq('client_id', orphan.id); // wellness_logs uses client_id for athlete
      
      // user_roles uses user_id
      await supabase.from('user_roles').delete().eq('user_id', orphan.id);

      const { error: delError } = await supabase.from('profiles').delete().eq('id', orphan.id);
      if (delError) console.error(`Failed to delete profile ${orphan.id}:`, delError.message);
    }
  }

  // 3. Ensure the profiles for our real users are marked as approved and assigned roles
  const emails = [
    'test_dr._smith@ishpo.com',
    'test_alex_athlete1@ishpo.com',
    'test_jordan_athlete2@ishpo.com',
    'test_sam_athlete3@ishpo.com',
    'test_taylor_athlete4@ishpo.com',
    'test_casey_athlete5@ishpo.com'
  ];

  for (const u of users) {
    if (emails.includes(u.email)) {
      console.log(`Approving and assigning role for: ${u.email}...`);
      const ams_role = u.email === 'test_dr._smith@ishpo.com' ? 'sports_scientist' : 'athlete';
      const app_role = ams_role === 'sports_scientist' ? 'admin' : 'client'; // admin or sports_scientist? The script used admin.
      
      // Wait, Dr. Smith is a sports_scientist. In ProtectRoute he needs 'sports_scientist'.
      // In UserApproval it sets 'sports_scientist' app_role too? No, 'sports_scientist' is a VALID value in user_roles.role enum.
      
      await supabase.from('profiles').update({ is_approved: true, ams_role }).eq('id', u.id);
      await supabase.from('user_roles').upsert({ user_id: u.id, role: ams_role === 'sports_scientist' ? 'sports_scientist' : 'client' });
    }
  }
  
  console.log('Cleanup and approval sync complete.');
}

cleanupOrphans()
