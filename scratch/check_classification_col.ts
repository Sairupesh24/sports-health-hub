import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

async function checkColumn() {
  const { data, error } = await supabase
    .from('questionnaires')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Error fetching questionnaires:", error);
    return;
  }

  if (data && data.length > 0) {
    const columns = Object.keys(data[0]);
    console.log("Columns in 'questionnaires':", columns);
    if (columns.includes('classification')) {
      console.log("SUCCESS: 'classification' column exists.");
    } else {
      console.error("FAILURE: 'classification' column is MISSING.");
    }
  } else {
    console.log("No questionnaires found to check columns. Attempting raw select...");
    // Try to select just the column
    const { error: colError } = await supabase
      .from('questionnaires')
      .select('classification')
      .limit(1);
    
    if (colError) {
      console.error("FAILURE: 'classification' column is MISSING or inaccessible:", colError.message);
    } else {
      console.log("SUCCESS: 'classification' column exists.");
    }
  }
}

checkColumn();
