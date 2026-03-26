import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Try to find .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function findUsers() {
  try {
    const { data: athletes, error: athleteError } = await supabase
      .from('profiles')
      .select('id, email, ams_role')
      .eq('ams_role', 'athlete')
      .limit(5);

    const { data: clients, error: clientError } = await supabase
      .from('profiles')
      .select('id, email, ams_role')
      .is('ams_role', null)
      .limit(5);

    if (athleteError) console.error('Athlete Error:', athleteError);
    if (clientError) console.error('Client Error:', clientError);

    console.log('ATHLETES:', athletes);
    console.log('CLIENTS:', clients);
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

findUsers();
