const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
  'https://fbjlgepxbyoyradaacvd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg'
);

async function main() {
  console.log('--- Checking Therapist Sessions ---');
  
  const { data: therapistSessions } = await sb.from('sessions')
    .select('therapist_id, scheduled_start')
    .not('therapist_id', 'is', null)
    .gte('scheduled_start', '2026-04-01T00:00:00Z')
    .lte('scheduled_start', '2026-04-30T23:59:59Z');
  
  console.log('Total assigned sessions in April 2026:', (therapistSessions || []).length);
  
  if (therapistSessions && therapistSessions.length > 0) {
    const tids = [...new Set(therapistSessions.map(s => s.therapist_id))];
    const { data: therapists } = await sb.from('profiles').select('id, first_name, last_name').in('id', tids);
    console.log('Therapists with assignments:', therapists);
  } else {
    console.log('NO sessions are assigned to ANY therapist in April 2026.');
    
    // Check if there are sessions in March or May
    const { data: otherSessions } = await sb.from('sessions')
        .select('scheduled_start')
        .not('therapist_id', 'is', null)
        .limit(5);
    console.log('Sample assigned sessions elsewhere:', otherSessions);
  }
}

main();
