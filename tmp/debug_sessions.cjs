const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
  'https://fbjlgepxbyoyradaacvd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg'
);

async function main() {
  console.log('--- Debugging Sessions ---');
  
  // 1. Get all profiles with clinical roles
  const { data: roles } = await sb.from('user_roles').select('*').in('role', ['consultant', 'sports_physician', 'physiotherapist']);
  console.log('Found', (roles || []).length, 'clinical roles');
  
  // 3. Check for sessions in April 2026
  const { data: aprilSessions } = await sb.from('sessions')
    .select('id, therapist_id, scheduled_start, scheduled_end')
    .gte('scheduled_start', '2026-04-01T00:00:00Z')
    .lte('scheduled_start', '2026-04-30T23:59:59Z');
  
  console.log('Total sessions in April 2026:', (aprilSessions || []).length);
  if (aprilSessions && aprilSessions.length > 0) {
    const tid = aprilSessions[0].therapist_id;
    console.log('\nTesting query for therapist:', tid);
    
    // ConsultantSchedule.tsx uses:
    // .gte("scheduled_start", dateRange.start)
    // .lte("scheduled_end", dateRange.end)
    
    // Let's assume dateRange is the whole month
    const start = '2026-03-30T00:00:00Z'; // startOfWeek(startOfMonth)
    const end = '2026-05-03T23:59:59Z'; // endOfWeek(endOfMonth)
    
    const { data: testResult, error: err1 } = await sb.from('sessions')
        .select('id, scheduled_end')
        .eq('therapist_id', tid)
        .gte('scheduled_start', start)
        .lte('scheduled_end', end);
    
    if (err1) console.error('Query Error 1:', err1);
    console.log('ConsultantSchedule query (lte scheduled_end) found:', (testResult || []).length, 'sessions');
    
    const { data: testResultAlt, error: err2 } = await sb.from('sessions')
        .select('id')
        .eq('therapist_id', tid)
        .gte('scheduled_start', start)
        .lt('scheduled_start', end);
    if (err2) console.error('Query Error 2:', err2);
    console.log('AdminCalendar query (lt scheduled_start) found:', (testResultAlt || []).length, 'sessions');

    // Check if scheduled_end is actually null for any sessions
    const { data: nullEnd } = await sb.from('sessions').select('id').is('scheduled_end', null).limit(1);
    console.log('Are there any sessions with null scheduled_end?', (nullEnd || []).length > 0);
  }
}

main();
