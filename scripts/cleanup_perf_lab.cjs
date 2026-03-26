const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// All seeded user emails
const SEEDED_EMAILS = [
  'test_dr._smith@ishpo.com',
  'test_alex@ishpo.com',
  'test_jordan@ishpo.com',
  'test_sam@ishpo.com',
  'test_taylor@ishpo.com',
  'test_casey@ishpo.com',
];

const ORG_NAME = 'ISHPO Performance Lab';

async function cleanup() {
  console.log('===== ISHPO PERFORMANCE LAB CLEANUP =====\n');

  // 1. Get the organization
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('name', ORG_NAME);

  const orgIds = (orgs || []).map(o => o.id);
  console.log(`Found ${orgIds.length} org(s) named "${ORG_NAME}":`, orgIds);

  // 2. List all seeded auth users
  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) { console.error('Could not list auth users:', listErr.message); return; }

  const seededUsers = users.filter(u => SEEDED_EMAILS.includes(u.email));
  const seededUserIds = seededUsers.map(u => u.id);
  console.log(`\nFound ${seededUsers.length} seeded auth user(s):`);
  seededUsers.forEach(u => console.log(`  - ${u.email} (${u.id})`));

  if (seededUserIds.length === 0 && orgIds.length === 0) {
    console.log('\nNothing to clean up. Exiting.');
    return;
  }

  // ─── Step 1: Delete performance assessments ───
  console.log('\n[1/9] Deleting performance_assessments...');
  if (seededUserIds.length > 0) {
    const r1 = await supabase.from('performance_assessments').delete().in('athlete_id', seededUserIds);
    const r2 = await supabase.from('performance_assessments').delete().in('recorded_by', seededUserIds);
    console.log('  athlete_id rows deleted:', r1.error ? r1.error.message : 'OK');
    console.log('  recorded_by rows deleted:', r2.error ? r2.error.message : 'OK');
  }

  // ─── Step 2: Delete sessions linked to org ───
  console.log('[2/9] Deleting sessions for org...');
  if (orgIds.length > 0) {
    const r = await supabase.from('sessions').delete().in('organization_id', orgIds);
    console.log('  sessions deleted:', r.error ? r.error.message : 'OK');
  }

  // ─── Step 3: Delete physio_session_details for seeded users ───
  // (already cascade-deleted via sessions, but just in case)

  // ─── Step 4: Delete clients linked to org ───
  console.log('[3/9] Deleting clients for org...');
  if (orgIds.length > 0) {
    const r = await supabase.from('clients').delete().in('organization_id', orgIds);
    console.log('  clients deleted:', r.error ? r.error.message : 'OK');
  }

  // ─── Step 5: Delete injuries for seeded user IDs ───
  // (already cascade-deleted via clients)

  // ─── Step 6: Delete user_roles for seeded users ───
  console.log('[4/9] Deleting user_roles for seeded users...');
  if (seededUserIds.length > 0) {
    const r = await supabase.from('user_roles').delete().in('user_id', seededUserIds);
    console.log('  user_roles deleted:', r.error ? r.error.message : 'OK');
  }

  // ─── Step 7: Delete profiles for seeded users ───
  console.log('[5/9] Deleting profiles for seeded users...');
  if (seededUserIds.length > 0) {
    const r = await supabase.from('profiles').delete().in('id', seededUserIds);
    console.log('  profiles deleted:', r.error ? r.error.message : 'OK');
  }

  // Also delete by email (for any profile linked differently)
  console.log('[6/9] Deleting profiles by email...');
  for (const email of SEEDED_EMAILS) {
    const r = await supabase.from('profiles').delete().eq('email', email);
    if (r.error) console.log(`  ${email}: ${r.error.message}`);
  }

  // ─── Step 8: Delete the organization itself ───
  console.log('[7/9] Deleting org...');
  if (orgIds.length > 0) {
    const r = await supabase.from('organizations').delete().in('id', orgIds);
    console.log('  organizations deleted:', r.error ? r.error.message : 'OK');
  }

  // ─── Step 9: Delete auth users ───
  console.log('[8/9] Deleting auth users...');
  for (const u of seededUsers) {
    const { error } = await supabase.auth.admin.deleteUser(u.id);
    if (error) {
      console.log(`  FAILED to delete ${u.email}: ${error.message}`);
    } else {
      console.log(`  Deleted auth user: ${u.email}`);
    }
  }

  // ─── Step 10: Final verification ───
  console.log('\n[9/9] Verification...');
  const { data: remainingOrg } = await supabase.from('organizations').select('id').eq('name', ORG_NAME);
  console.log(`  "${ORG_NAME}" orgs remaining: ${(remainingOrg || []).length}`);

  const { data: remainingPerf } = await supabase.from('performance_assessments').select('id', { count: 'exact', head: true });
  console.log(`  performance_assessments total remaining: (check manually if needed)`);

  console.log('\n===== CLEANUP COMPLETE =====');
}

cleanup().catch(console.error);
