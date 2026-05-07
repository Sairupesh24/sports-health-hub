import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkColumn() {
  const { error } = await supabase
    .from('form_responses')
    .select('clinical_interpretation')
    .limit(1);
  
  if (error) {
    console.error('Error fetching clinical_interpretation:', error.message);
  } else {
    console.log('clinical_interpretation column exists');
  }
}

checkColumn();
