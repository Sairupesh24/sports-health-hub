const { createClient } = require('@supabase/supabase-js');
const sb = createClient('https://fbjlgepxbyoyradaacvd.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg');

async function findOrphanSessions() {
  const { data: profiles } = await sb.from('profiles').select('id, email');
  const { data: { users: authUsers } } = await sb.auth.admin.listUsers();
  const orphans = profiles.filter(p => !authUsers.some(u => u.id === p.id));
  const orphanIds = orphans.map(o => o.id);

  console.log(`Checking for sessions linked to ${orphanIds.length} orphans...`);

  // Check client_id
  const { data: clientSessions } = await sb.from('sessions').select('id, client_id, status, actual_end').in('client_id', orphanIds);
  if (clientSessions && clientSessions.length > 0) {
    console.log(`Found ${clientSessions.length} sessions where orphan is the Client:`);
    clientSessions.forEach(s => console.log(`  - Session ${s.id} | Status: ${s.status} | End: ${s.actual_end}`));
  }

  // Check owner_id (consultant)
  const { data: ownerSessions } = await sb.from('sessions').select('id, owner_id, status, actual_end').in('owner_id', orphanIds);
  if (ownerSessions && ownerSessions.length > 0) {
    console.log(`Found ${ownerSessions.length} sessions where orphan is the Owner:`);
    ownerSessions.forEach(s => console.log(`  - Session ${s.id} | Status: ${s.status} | End: ${s.actual_end}`));
  }
  
  if (clientSessions?.length === 0 && ownerSessions?.length === 0) {
    console.log('No orphaned sessions found. The error might be coming from a different link.');
  }
}

findOrphanSessions();
