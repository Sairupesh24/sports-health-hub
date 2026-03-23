
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://fbjlgepxbyoyradaacvd.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns(tableName: string) {
  const { data, error } = await supabase.from(tableName).select('*').limit(1);
  if (error) {
    console.error(error);
  } else {
    if (data.length === 0) {
        console.log("No data found to infer columns for table: " + tableName);
    } else {
        console.log(Object.keys(data[0]).join(', '));
    }
  }
}

const table = process.argv[2] || 'sessions';
checkColumns(table);
