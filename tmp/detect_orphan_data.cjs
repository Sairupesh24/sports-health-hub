const { createClient } = require('@supabase/supabase-js');
const sb = createClient('https://fbjlgepxbyoyradaacvd.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg');

async function detailedOrphanScan() {
  const { data: profiles } = await sb.from('profiles').select('id, email');
  const { data: { users: authUsers } } = await sb.auth.admin.listUsers();
  const orphans = profiles.filter(p => !authUsers.some(u => u.id === p.id));
  const orphanIds = orphans.map(o => o.id);

  console.log(`Analyzing ${orphanIds.length} orphaned profiles...`);

  const checks = [
    { table: 'user_roles', col: 'user_id' },
    { table: 'wellness_logs', col: 'athlete_id' },
    { table: 'training_sessions', col: 'athlete_id' },
    { table: 'appointments', col: 'client_id' },
    { table: 'appointments', col: 'consultant_id' },
    { table: 'sessions', col: 'client_id' },
    { table: 'sessions', col: 'owner_id' },
    { table: 'workout_logs', col: 'athlete_id' },
    { table: 'performance_results', col: 'athlete_id' },
    { table: 'entitlements', col: 'client_id' }
  ];

  for (const check of checks) {
    const { data, error } = await sb.from(check.table).select(check.col).in(check.col, orphanIds);
    if (data && data.length > 0) {
      console.log(`  - Found ${data.length} orphaned records in "${check.table}" (column: ${check.col})`);
    } else if (error) {
       // Table might not exist or schema is different
    }
  }
}

detailedOrphanScan();
