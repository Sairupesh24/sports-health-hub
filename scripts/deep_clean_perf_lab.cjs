const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const ORG_NAME = 'ISHPO Performance Lab';

async function deepClean() {
  console.log('===== DEEP CLEAN: ISHPO PERFORMANCE LAB =====\n');

  // Find org
  const { data: orgs } = await supabase.from('organizations').select('id, name').eq('name', ORG_NAME);
  const orgIds = (orgs || []).map(o => o.id);
  console.log('Org IDs:', orgIds);

  if (orgIds.length === 0) {
    console.log('Org not found, nothing to do.');
    return;
  }

  const orgId = orgIds[0];

  // Find ALL profiles linked to this org
  const { data: profiles } = await supabase.from('profiles').select('id, email, ams_role, profession').eq('organization_id', orgId);

  console.log(`\nProfiles in org (${(profiles||[]).length}):`);
  (profiles || []).forEach(p => console.log(`  - ${p.email || 'no email'} [${p.ams_role}/${p.profession}] id=${p.id}`));


  // Find ALL clients linked to this org
  const { data: clients } = await supabase.from('clients').select('id, first_name, last_name').eq('organization_id', orgId);
  console.log(`\nClients in org (${(clients||[]).length}):`);
  (clients || []).forEach(c => console.log(`  - ${c.first_name} ${c.last_name} id=${c.id}`));

  // Get profile IDs for cascade deletion
  const profileIds = (profiles || []).map(p => p.id);
  const clientIds = (clients || []).map(c => c.id);

  // Delete in strict order
  console.log('\n--- DELETING DATA IN DEPENDENCY ORDER ---');

  // 1. performance_assessments
  if (profileIds.length > 0) {
    let r = await supabase.from('performance_assessments').delete().in('athlete_id', profileIds);
    console.log('[1] performance_assessments (athlete_id):', r.error?.message || 'OK');
    r = await supabase.from('performance_assessments').delete().in('recorded_by', profileIds);
    console.log('[1] performance_assessments (recorded_by):', r.error?.message || 'OK');
  }

  // 2. sessions
  let r = await supabase.from('sessions').delete().eq('organization_id', orgId);
  console.log('[2] sessions:', r.error?.message || 'OK');

  // 3. injuries for clients
  if (clientIds.length > 0) {
    r = await supabase.from('injuries').delete().in('client_id', clientIds);
    console.log('[3] injuries:', r.error?.message || 'OK');
  }

  // 4. bills
  if (clientIds.length > 0) {
    r = await supabase.from('bills').delete().in('client_id', clientIds);
    console.log('[4] bills:', r.error?.message || 'OK');
  }

  // 5. clients
  r = await supabase.from('clients').delete().eq('organization_id', orgId);
  console.log('[5] clients:', r.error?.message || 'OK');

  // 6. user_roles
  if (profileIds.length > 0) {
    r = await supabase.from('user_roles').delete().in('user_id', profileIds);
    console.log('[6] user_roles:', r.error?.message || 'OK');
  }

  // 7. session_templates
  if (profileIds.length > 0) {
    r = await supabase.from('session_templates').delete().in('scientist_id', profileIds);
    console.log('[7] session_templates:', r.error?.message || 'OK');
  }

  // 8. profiles
  r = await supabase.from('profiles').delete().eq('organization_id', orgId);
  console.log('[8] profiles:', r.error?.message || 'OK');

  // 9. Try deleting org now
  r = await supabase.from('organizations').delete().eq('id', orgId);
  console.log('[9] organization:', r.error?.message || 'OK');

  // 10. Delete auth users for these profile ids
  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
  if (!listErr) {
    const toDelete = users.filter(u => profileIds.includes(u.id) || (u.email || '').endsWith('@ishpo.com'));
    console.log(`\n[10] Deleting ${toDelete.length} auth user(s)...`);
    for (const u of toDelete) {
      const { error } = await supabase.auth.admin.deleteUser(u.id);
      console.log(`  ${u.email}: ${error ? error.message : 'Deleted OK'}`);
    }
  }

  // Final check
  const { data: remOrg } = await supabase.from('organizations').select('id').eq('name', ORG_NAME);
  console.log(`\nOrgs remaining with name "${ORG_NAME}": ${(remOrg||[]).length}`);
  console.log('\n===== DEEP CLEAN COMPLETE =====');
}

deepClean().catch(console.error);
