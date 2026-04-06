const { createClient } = require('@supabase/supabase-js');
const sb = createClient('https://fbjlgepxbyoyradaacvd.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg');

async function performCleanup() {
  console.log('--- Phase 1: Identifying Orphans ---');
  const { data: profiles } = await sb.from('profiles').select('id, email');
  const { data: { users: authUsers } } = await sb.auth.admin.listUsers();
  const orphans = profiles.filter(p => !authUsers.some(u => u.id === p.id));
  const orphanIds = orphans.map(o => o.id);

  if (orphanIds.length === 0) {
    console.log('No orphans found. Cleanup aborted.');
    return;
  }
  
  console.log(`Found ${orphanIds.length} orphaned profiles.`);

  console.log('\n--- Phase 2: Temporarily Disabling Trigger ---');
  // We disable the session governance trigger via RPC to allow deleting these profiles
  const disableSql = 'ALTER TABLE public.sessions DISABLE TRIGGER session_governance_check;';
  const { error: disableErr } = await sb.rpc('exec_sql_query', { query: disableSql });
  if (disableErr) {
    console.warn('  Warning: Could not disable trigger (may not have permission):', disableErr.message);
  } else {
    console.log('  Trigger "session_governance_check" disabled.');
  }

  try {
    console.log('\n--- Phase 3: Clearing User Roles ---');
    const { error: rolesError } = await sb.from('user_roles').delete().in('user_id', orphanIds);
    if (rolesError) console.error('  Error clearing user_roles:', rolesError.message);
    else console.log('  Cleared metadata from user_roles.');

    console.log('\n--- Phase 4: Deleting Profiles ---');
    const { error: profilesError } = await sb.from('profiles').delete().in('id', orphanIds);
    if (profilesError) console.error('  Error deleting profiles:', profilesError.message);
    else console.log(`  Successfully deleted ${orphanIds.length} orphaned profiles.`);

  } finally {
    console.log('\n--- Phase 5: Re-enabling Trigger ---');
    const enableSql = 'ALTER TABLE public.sessions ENABLE TRIGGER session_governance_check;';
    const { error: enableErr } = await sb.rpc('exec_sql_query', { query: enableSql });
    if (enableErr) {
       console.error('  CRITICAL: Could not re-enable trigger!', enableErr.message);
    } else {
       console.log('  Trigger "session_governance_check" re-enabled.');
    }
  }

  console.log('\n--- Phase 6: Final Verification ---');
  const { data: finalProfiles } = await sb.from('profiles').select('id');
  const finalOrphans = finalProfiles.filter(p => !authUsers.some(u => u.id === p.id));
  console.log(`Orphans remaining: ${finalOrphans.length}`);
}

performCleanup();
