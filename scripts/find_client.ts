
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://fbjlgepxbyoyradaacvd.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg";

const supabase = createClient(supabaseUrl, supabaseKey);

async function findClient(uhid: string) {
  const { data, error } = await supabase.from('clients').select('id, first_name, last_name, uhid').eq('uhid', uhid).single();
  if (error) {
    console.error(error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

const uhid = process.argv[2];
if (!uhid) {
    console.error("Missing UHID");
    process.exit(1);
}
findClient(uhid);
