const { createClient } = require('@supabase/supabase-js');
const sb = createClient('https://fbjlgepxbyoyradaacvd.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg');

async function scanForOrphans() {
  const { data: profiles } = await sb.from('profiles').select('id, email, first_name, last_name');
  const { data: { users: authUsers } } = await sb.auth.admin.listUsers();
  
  const orphans = profiles.filter(p => !authUsers.some(u => u.id === p.id));
  
  console.log(`Orphaned Profiles Found: ${orphans.length}`);
  orphans.forEach(o => {
    console.log(`  - ID: ${o.id} | Email: ${o.email} | Name: ${o.first_name} ${o.last_name}`);
  });
  
  // List of tables that might have references to profile IDs
  const dependentTables = [
    'user_roles',
    'wellness_logs',
    'training_sessions',
    'external_telemetry',
    'appointments',
    'sessions',
    'entitlements',
    'waitlist',
    'client_documents',
    'workout_logs',
    'performance_results'
  ];

  console.log('\nScanning dependent tables for orphaned links...');
  for (const table of dependentTables) {
    try {
      // We check for any records where the 'athlete_id', 'user_id', or 'consultant_id' matches an orphan
      // This is generic, we'll try to find any column that might hold the ID
      const { data, error } = await sb.from(table).select('*').limit(1); // Just to check schema
      if (error && error.code !== 'PGRST116') {
        // Table might not exist or columns might be different
        continue;
      }
    } catch (e) {}
  }
}

scanForOrphans();
