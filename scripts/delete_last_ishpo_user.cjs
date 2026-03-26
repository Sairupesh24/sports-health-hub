const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deleteRemainingIshpo() {
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const ishpoUsers = users.filter(u => (u.email || '').includes('@ishpo.com'));
  console.log(`Remaining @ishpo.com auth users: ${ishpoUsers.length}`);
  for (const u of ishpoUsers) {
    // Also clean up any lingering profiles/user_roles for this user
    await supabase.from('user_roles').delete().eq('user_id', u.id);
    await supabase.from('profiles').delete().eq('id', u.id);
    const { error } = await supabase.auth.admin.deleteUser(u.id);
    console.log(`  ${u.email} (${u.id}): ${error ? error.message : '✅ Deleted'}`);
  }
  
  // Final check
  const { data: { users: remaining } } = await supabase.auth.admin.listUsers();
  const leftover = remaining.filter(u => (u.email || '').includes('@ishpo.com'));
  console.log(`\nFinal @ishpo.com auth users: ${leftover.length === 0 ? '✅ 0' : leftover.map(u => u.email).join(', ')}`);
}

deleteRemainingIshpo().catch(console.error);
