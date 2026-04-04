const { createClient } = require('@supabase/supabase-js');
const sb = createClient('https://fbjlgepxbyoyradaacvd.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg');

async function findBlockingLinks() {
  const { data: profiles } = await sb.from('profiles').select('id, email');
  const { data: { users: authUsers } } = await sb.auth.admin.listUsers();
  const orphanIds = profiles.filter(p => !authUsers.some(u => u.id === p.id)).map(o => o.id);

  console.log(`Searching for data linked to ${orphanIds.length} orphans...`);

  // We'll try to find ANY row in ANY common table that has these IDs
  // Since we don't have exec_sql, we have to check tables we know
  const tables = [
    { name: 'sessions', cols: ['client_id', 'owner_id'] },
    { name: 'appointments', cols: ['client_id', 'consultant_id'] },
    { name: 'wellness_logs', cols: ['athlete_id'] },
    { name: 'training_sessions', cols: ['athlete_id'] },
    { name: 'workout_logs', cols: ['athlete_id'] },
    { name: 'performance_results', cols: ['athlete_id'] },
    { name: 'entitlements', cols: ['client_id'] },
    { name: 'waitlist', cols: ['client_id'] },
    { name: 'client_documents', cols: ['client_id', 'uploaded_by'] },
    { name: 'user_roles', cols: ['user_id'] }
  ];

  for (const t of tables) {
    for (const col of t.cols) {
      const { data, error } = await sb.from(t.name).select('id').in(col, orphanIds);
      if (data && data.length > 0) {
        console.log(`  [!] Table "${t.name}" column "${col}" has ${data.length} orphaned references.`);
        // List a few
        data.slice(0, 3).forEach(d => console.log(`      - Record ID: ${d.id}`));
      }
    }
  }
}

findBlockingLinks();
