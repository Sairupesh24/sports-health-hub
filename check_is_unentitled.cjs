const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

const URL = process.env.VITE_SUPABASE_URL;
const KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(URL, KEY);

async function checkSchema() {
  console.log('Checking for is_unentitled column in sessions table...');
  const { data, error } = await supabase.from('sessions').select('is_unentitled').limit(1);
  if (error) {
    if (error.code === 'PGRST204' || error.message.includes('column "is_unentitled" does not exist')) {
      console.error('MISSING_COLUMN: Column "is_unentitled" does not exist in sessions table.');
    } else {
      console.error('ERROR:', error);
    }
  } else {
    console.log('SUCCESS: Column "is_unentitled" exists.');
  }
}

checkSchema();
