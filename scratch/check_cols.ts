import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkColumns() {
  const { data, error } = await supabase
    .from('form_responses')
    .select('*')
    .limit(0); // Get schema without data
  
  if (error) {
    console.error('Error:', error.message);
  } else {
    // This won't work to get column names if table is empty, 
    // but we can try to select specific columns and see if it fails.
    const cols = ['specialist_id', 'clinical_interpretation', 'status'];
    for (const col of cols) {
      const { error: colError } = await supabase
        .from('form_responses')
        .select(col)
        .limit(1);
      if (colError) {
        console.log(`Column ${col} does NOT exist:`, colError.message);
      } else {
        console.log(`Column ${col} exists`);
      }
    }
  }
}

checkColumns();
