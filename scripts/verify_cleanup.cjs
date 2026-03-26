const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verify() {
  console.log('===== POST-CLEANUP VERIFICATION =====\n');

  const { data: orgs } = await supabase.from('organizations').select('id, name').eq('name', 'ISHPO Performance Lab');
  console.log(`"ISHPO Performance Lab" org: ${(orgs||[]).length === 0 ? '✅ DELETED' : '❌ STILL EXISTS: ' + JSON.stringify(orgs)}`);

  const { count: perfCount } = await supabase.from('performance_assessments').select('*', { count: 'exact', head: true });
  console.log(`performance_assessments total: ${perfCount ?? '?'}`);

  const { data: { users } } = await supabase.auth.admin.listUsers();
  const ishpoUsers = users.filter(u => (u.email || '').includes('@ishpo.com'));
  console.log(`\nAuth users still with @ishpo.com email (${ishpoUsers.length}):`);
  if (ishpoUsers.length === 0) {
    console.log('  ✅ None remaining');
  } else {
    ishpoUsers.forEach(u => console.log(`  ❌ ${u.email} (${u.id})`));
  }

  console.log('\n===== DONE =====');
}

verify().catch(console.error);
