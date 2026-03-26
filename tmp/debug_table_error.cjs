const { createClient } = require('@supabase/supabase-js');

const URL = "https://fbjlgepxbyoyradaacvd.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg";

const supabase = createClient(URL, KEY);

async function debugTable() {
  console.log('Debugging training_programs table...');
  
  const { data, error } = await supabase.from('training_programs').select('*').limit(1);
  
  if (error) {
    console.log('ERROR TYPE:', typeof error);
    console.log('ERROR JSON:', JSON.stringify(error, null, 2));
    console.log('ERROR MESSAGE:', error.message);
    console.log('ERROR CODE:', error.code);
    console.log('ERROR HINT:', error.hint);
  } else {
    console.log('SUCCESS! Data found:', data);
  }
}

debugTable();
