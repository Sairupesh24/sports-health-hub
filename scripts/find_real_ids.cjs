const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function findRealIds() {
  const emails = [
    'test_dr._smith@ishpo.com',
    'test_alex_athlete1@ishpo.com',
    'test_jordan_athlete2@ishpo.com',
    'test_sam_athlete3@ishpo.com',
    'test_taylor_athlete4@ishpo.com',
    'test_casey_athlete5@ishpo.com'
  ];

  console.log('Finding Real IDs for Seeded Emails...');
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error('List failed:', error.message);
    return;
  }

  const emailToId = {};
  users.forEach(u => {
    if (emails.includes(u.email)) {
      emailToId[u.email] = u.id;
    }
  });

  console.log('Real IDs:', JSON.stringify(emailToId, null, 2));

  // Also check profiles for these emails
  const { data: profiles } = await supabase.from('profiles').select('id, email, first_name, last_name').in('email', emails);
  console.log('Existing Profiles for these emails:', JSON.stringify(profiles, null, 2));
}

findRealIds()
