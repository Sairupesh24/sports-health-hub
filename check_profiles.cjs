const { createClient } = require('@supabase/supabase-js');

const URL = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';

const supabase = createClient(URL, SERVICE_KEY);

async function checkProfiles() {
  const { data, error } = await supabase.from('profiles').select('email, is_approved').limit(10);
  if (error) {
    console.log('ERROR:', error);
  } else {
    console.log('PROFILES:', data);
  }
}

checkProfiles();
