import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

async function checkColumns() {
  console.log("Checking questionnaires table columns...");
  const { data, error } = await supabase
    .from('questionnaires')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Error fetching questionnaires:", error);
    return;
  }

  if (data && data.length > 0) {
    console.log("Columns found:", Object.keys(data[0]));
  } else {
    console.log("No data in questionnaires table to infer columns from.");
  }
}

checkColumns();
