const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function finalForceApprove() {
  console.log('Final Force Approval for Test Athletes...');
  
  const emails = [
    'test_alex@ishpo.com',
    'test_jordan@ishpo.com',
    'test_sam@ishpo.com',
    'test_taylor@ishpo.com',
    'test_casey@ishpo.com'
  ];

  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) return;

  for (const u of users) {
    if (emails.includes(u.email)) {
      console.log(`- Approving ${u.email}...`);
      await supabase.from('profiles').update({ is_approved: true, ams_role: 'athlete' }).eq('id', u.id);
      await supabase.from('user_roles').upsert({ user_id: u.id, role: 'client' }); // 'client' is the app role for athletes
    }
  }
  
  console.log('Done.');
}

finalForceApprove()
