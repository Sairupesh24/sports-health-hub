const { createClient } = require('@supabase/supabase-js');
const sb = createClient('https://fbjlgepxbyoyradaacvd.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg');

async function checkScreenUsers() {
  const emails = [
    'foe3445@ishpo.com',
    'client3445@ishpo.com',
    'saikavuturi24@gmail.com',
    'scientist_test@example.com',
    'doctor3445@ishpo.com'
  ];

  const { data: profiles } = await sb.from('profiles').select('email, organization_id').in('email', emails);
  
  console.log('--- User Organizations ---');
  profiles.forEach(p => {
    console.log(`  - ${p.email.padEnd(25)} | Org ID: ${p.organization_id}`);
  });
}

checkScreenUsers();
