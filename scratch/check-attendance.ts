
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://fbjlgepxbyoyradaacvd.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMapping() {
  console.log("Checking mapping in hr_attendance_logs query...");
  
  const { data, error } = await supabase
    .from("hr_attendance_logs")
    .select(`
      *,
      profile:profiles(
        first_name, 
        last_name, 
        email,
        user_roles(role)
      )
    `)
    .limit(1);

  if (error) {
    console.error("Query Error:", error);
  } else {
    console.log("Query Result Sample (JSON):");
    console.log(JSON.stringify(data, null, 2));
  }
}

checkMapping();
