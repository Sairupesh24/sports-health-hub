const { createClient } = require('@supabase/supabase-js');
const sb = createClient('https://fbjlgepxbyoyradaacvd.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg');

async function listAll() {
  console.log('--- Auth Users ---');
  const { data: { users } } = await sb.auth.admin.listUsers();
  users.forEach(u => console.log(`  - ${u.email} (${u.id})`));

  console.log('\n--- Profiles ---');
  const { data: profiles } = await sb.from('profiles').select('id, email, organization_id');
  profiles.forEach(p => console.log(`  - ${p.email} (${p.id}) | Org: ${p.organization_id}`));
}

listAll();
