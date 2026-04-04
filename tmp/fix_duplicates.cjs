const { createClient } = require('@supabase/supabase-js');
const sb = createClient('https://fbjlgepxbyoyradaacvd.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg');

async function check() {
  const { data: p } = await sb.from('profiles').select('id').eq('email','doctor3445@ishpo.com');
  const { data: { users: u } } = await sb.auth.admin.listUsers();
  const targetU = u.filter(x => x.email === 'doctor3445@ishpo.com')[0];
  
  console.log('Target Auth ID:', targetU?.id || 'NOT FOUND');
  p.forEach(x => {
    const isOrphan = x.id !== targetU?.id;
    console.log(`Profile ID: ${x.id} | Orphan? ${isOrphan}`);
  });
}
check();
