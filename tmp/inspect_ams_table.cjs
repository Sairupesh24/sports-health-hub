const { createClient } = require('@supabase/supabase-js');

const URL = "https://fbjlgepxbyoyradaacvd.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg";

const supabase = createClient(URL, KEY);

async function inspectTable() {
  console.log('Inspecting training_programs table structure...');
  
  // Try to query information_schema if possible, or just look at one row's keys
  const { data, error } = await supabase.from('training_programs').select('*').limit(1);
  
  if (error) {
    console.log('Error querying training_programs:', error.message);
  } else {
    console.log('Table exists. Columns found in first row (if any):');
    if (data && data.length > 0) {
      console.log(Object.keys(data[0]));
    } else {
      console.log('Table is empty, trying to get columns via a different way...');
      // Try to insert a dummy row with an empty object to see what it complains about? No.
      // Let's try to query the columns from information_schema via an RPC if one exists? No.
      
      // I'll try to just guess by attempting a small insert.
      const { error: iError } = await supabase.from('training_programs').insert({}).select();
      console.log('Insert of empty object error (reveals required columns):', iError?.message);
    }
  }
}

inspectTable();
