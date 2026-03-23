const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://fbjlgepxbyoyradaacvd.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg');

const types = [
  'Performance Assessment', 'Device Testing', 'Testing & Training', 'Training', 
  'Online session', 'Physiotherapy', 'Studying/Research', 
  'Video Production/Video shooting/Video Editing', 'Site Visit/Business Development', 
  'Meeting', 'Travelling', 'Athlete/Parent Counselling', 'Initial Consultation', 
  'Guest Visits(at Center and Outside)', 'Off-site Testing', 'Off-site Training', 
  'Group Session', 'Office Work', 'On-Court/On-Field Observations', 'Report Making', 
  'Warmup/ cool down', 'Data work', 'Program Design/Program planning and sharing', 
  'Match day/ Observation', 'Doctor consultation'
];

async function run() {
  try {
    // 1. Get Org ID
    const { data: profile, error: profError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('email', 'scientist_test@example.com')
      .single();
    
    if (profError) throw new Error('Profile fetch failed: ' + profError.message);
    const orgId = profile.organization_id;
    console.log('Target Organization:', orgId);

    // 2. Check if table exists (simple query)
    const { error: tableCheckError } = await supabase
      .from('session_types')
      .select('count', { count: 'exact', head: true });

    if (tableCheckError && tableCheckError.code === 'PGRST204') {
        console.log('Table session_types not found. We cannot easily create it from client without RPC or Edge function.');
        console.log('Assuming user has applied migrations and we just need to wait or re-check.');
    }

    // 3. Upsert Types
    const inserts = types.map(name => ({ organization_id: orgId, name }));
    const { error: insertError } = await supabase
      .from('session_types')
      .upsert(inserts, { onConflict: 'organization_id,name' });

    if (insertError) {
        console.error('Insert Error Detail:', JSON.stringify(insertError, null, 2));
        throw insertError;
    }

    console.log('Successfully seeded', types.length, 'session types.');

  } catch (e) {
    console.error('Final Error:', e.message);
  }
}

run();
