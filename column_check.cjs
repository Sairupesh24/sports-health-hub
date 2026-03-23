const { createClient } = require('@supabase/supabase-js');

const URL = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';

const supabase = createClient(URL, SERVICE_KEY);

async function check() {
  console.log('Querying non_existent_column from session_types...');
  const { data, error } = await supabase.from('session_types').select('non_existent_column').limit(1);
  if (error) {
    console.log('ERRORCODE:', error.code);
    console.log('ERRORMESSAGE:', error.message);
  } else {
    console.log('SUCCESS (WEIRD):', data);
  }
}

check();
