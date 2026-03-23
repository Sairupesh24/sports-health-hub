const { createClient } = require('@supabase/supabase-js');

const URL = "https://fbjlgepxbyoyradaacvd.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg";

const supabase = createClient(URL, KEY);

async function checkSchema() {
  console.log('Checking for is_unentitled column in sessions table...');
  const { data, error } = await supabase.from('sessions').select('is_unentitled').limit(1);
  if (error) {
    console.log('ERRORCODE:', error.code);
    console.log('ERRORMESSAGE:', error.message);
  } else {
    console.log('SUCCESS: Column "is_unentitled" exists.');
  }
}

checkSchema();
