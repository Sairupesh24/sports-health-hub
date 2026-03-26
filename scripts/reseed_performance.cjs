const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function reseedHistoricalData() {
  console.log('--- RESEEDING HISTORICAL DATA ---');

  const emails = [
    'test_dr._smith@ishpo.com',
    'test_alex@ishpo.com',
    'test_jordan@ishpo.com',
    'test_sam@ishpo.com',
    'test_taylor@ishpo.com',
    'test_casey@ishpo.com'
  ];

  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Auth list failed:', error.message);
    return;
  }

  const emailToId = {};
  users.forEach(u => {
    if (emails.includes(u.email)) emailToId[u.email] = u.id;
  });

  const scientistId = emailToId['test_dr._smith@ishpo.com'];
  const athleteIds = emails.filter(e => e !== 'test_dr._smith@ishpo.com').map(e => emailToId[e]).filter(Boolean);

  if (!scientistId || athleteIds.length === 0) {
    console.error('Missing some real IDs. Found scientist:', !!scientistId, 'Athletes count:', athleteIds.length);
    console.log('Available Emails:', users.map(u => u.email));
    return;
  }

  console.log('Scientist ID:', scientistId);
  console.log('Athlete IDs:', athleteIds);

  console.log('Clearing old assessments...');
  await supabase.from('performance_assessments').delete().in('athlete_id', athleteIds);

  console.log(`Generating data for ${athleteIds.length} athletes...`);
  const testTypes = [
    { category: 'Jump', name: 'CMJ', unit: 'cm', min: 30, max: 65 },
    { category: 'Jump', name: 'Broad Jump', unit: 'cm', min: 200, max: 280 },
    { category: 'Sprint', name: '30m Sprint', unit: 'sec', min: 4.0, max: 4.8 },
    { category: 'Strength', name: 'Back Squat 1RM', unit: 'kg', min: 80, max: 180 },
    { category: 'Mobility', name: 'FMS Score', unit: 'score', min: 14, max: 21 },
  ];

  const assessments = [];
  const now = new Date();

  for (const aid of athleteIds) {
    for (let j = 0; j < 6; j++) {
      const recordedAt = new Date(now.getTime() - (j * 30 * 24 * 60 * 60 * 1000));
      for (const test of testTypes) {
        assessments.push({
          athlete_id: aid,
          test_name: test.name,
          category: test.category,
          metrics: { value: parseFloat((Math.random() * (test.max - test.min) + test.min).toFixed(2)), unit: test.unit },
          recorded_at: recordedAt.toISOString(),
          recorded_by: scientistId
        });
      }
    }
  }

  console.log(`Inserting ${assessments.length} records...`);
  const { error: insError } = await supabase.from('performance_assessments').insert(assessments);
  if (insError) {
    console.error('Insert failed:', insError.message);
  } else {
    console.log('--- RE-SEEDING COMPLETE ---');
  }
}

reseedHistoricalData()
