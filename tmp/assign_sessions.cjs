const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';
const specialistId = '038534d3-100f-43b3-a68a-fffc3ba8ab62'; // Doctor Test

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log('Fetching unassigned sessions in April 2026...');
  const { data: sessions, error: fetchError } = await supabase.from('sessions')
    .select('id, scheduled_start')
    .is('therapist_id', null)
    .gte('scheduled_start', '2026-04-01T00:00:00Z')
    .lte('scheduled_start', '2026-04-30T23:59:59Z');

  if (fetchError) {
    console.error('Fetch error:', fetchError);
    return;
  }

  if (!sessions || sessions.length === 0) {
    console.log('No unassigned sessions found in April 2026.');
    return;
  }

  console.log(`Found ${sessions.length} sessions. Assigning to ${specialistId}...`);

  const ids = sessions.map(s => s.id);
  const { error: updateError } = await supabase.from('sessions')
    .update({ therapist_id: specialistId })
    .in('id', ids);

  if (updateError) {
    console.error('Update error:', updateError);
  } else {
    console.log(`✅ successfully assigned ${sessions.length} sessions to specialist.`);
  }
}

run();
