const { createClient } = require('@supabase/supabase-js');

const URL = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NDM5ODUsImV4cCI6MjA4ODAxOTk4NX0.78A6t7i9ySqe5fR3EyHnrWq_MK-b0w70MpouMXdHkzM';

const supabaseService = createClient(URL, SERVICE_KEY);
const supabaseAnon = createClient(URL, ANON_KEY);

async function check() {
  console.log('--- SERVICE ROLE CHECK ---');
  const { data: sData, error: sError } = await supabaseService.from('session_types').select('*').limit(1);
  if (sError) console.log('Service Error:', sError.message);
  else console.log('Service Success: Table visible');

  console.log('\n--- ANON CHECK ---');
  const { data: aData, error: aError } = await supabaseAnon.from('session_types').select('*').limit(1);
  if (aError) console.log('Anon Error:', aError.message);
  else console.log('Anon Success: Table visible');
  
  // Also check session_templates because it's linked
  const { error: tError } = await supabaseAnon.from('session_templates').select('*').limit(1);
  if (tError) console.log('Anon session_templates Error:', tError.message);
}

check();
