const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const ORG_NAME = 'ISHPO Performance Lab';

async function finalClean() {
  console.log('===== FINAL TARGETED CLEANUP =====\n');

  // Get the org
  const { data: orgs } = await supabase.from('organizations').select('id').eq('name', ORG_NAME);
  if (!orgs || orgs.length === 0) { console.log('Org already gone!'); }
  const orgId = orgs?.[0]?.id;
  console.log('Org ID:', orgId);

  // Find remaining @ishpo.com auth users and delete them
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const ishpoUsers = users.filter(u => (u.email || '').includes('@ishpo.com'));
  console.log(`Remaining @ishpo.com users: ${ishpoUsers.length}`);
  for (const u of ishpoUsers) {
    const { error } = await supabase.auth.admin.deleteUser(u.id);
    console.log(`  Delete ${u.email}: ${error ? error.message : 'OK'}`);
  }

  if (!orgId) return;

  // Delete remaining performance_assessments
  const r0 = await supabase.from('performance_assessments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('\nAll performance_assessments:', r0.error?.message || 'Deleted all OK');

  // Wipe tables that might reference the org
  const tablesToWipe = [
    { table: 'referral_sources', col: 'organization_id' },
    { table: 'services',         col: 'organization_id' },
    { table: 'packages',         col: 'organization_id' },
    { table: 'session_types',    col: 'organization_id' },
    { table: 'session_templates',col: 'organization_id' },
    { table: 'sessions',         col: 'organization_id' },
    { table: 'injuries',         col: 'organization_id' },
    { table: 'bills',            col: 'organization_id' },
    { table: 'clients',          col: 'organization_id' },
    { table: 'profiles',         col: 'organization_id' },
  ];

  for (const { table, col } of tablesToWipe) {
    const r = await supabase.from(table).delete().eq(col, orgId);
    if (r.error) {
      console.log(`  [${table}]: ${r.error.message}`);
    } else {
      console.log(`  [${table}]: OK`);
    }
  }

  // Now delete the org
  const r = await supabase.from('organizations').delete().eq('id', orgId);
  console.log('\nDelete organization:', r.error ? r.error.message : '✅ DELETED');

  // Final count
  const { data: remaining } = await supabase.from('organizations').select('id').eq('name', ORG_NAME);
  console.log(`"${ORG_NAME}" remaining: ${(remaining||[]).length === 0 ? '✅ 0' : '❌ ' + (remaining||[]).length}`);

  console.log('\n===== DONE =====');
}

finalClean().catch(console.error);
