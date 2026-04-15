import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function deepInspect() {
    console.log("--- Inspecting emergency_alerts ---");
    const { data: cols, error: err1 } = await supabase.rpc('exec_sql', { sql_query: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'emergency_alerts'" });
    console.log("Columns:", cols);

    const { data: fks, error: err2 } = await supabase.rpc('exec_sql', { sql_query: "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'public.emergency_alerts'::regclass" });
    console.log("Constraints:", fks);

    console.log("--- Testing Join (Profiles -> Emergency Alerts) ---");
    const { data: joinTest, error: err3 } = await supabase.from('profiles').select('id, emergency_alerts(id, status)').limit(1);
    console.log("Join Profiles->Alerts Result:", joinTest ? "SUCCESS" : "FAILED", err3);

    console.log("--- Testing Join (Alerts -> Profiles) ---");
    const { data: joinTest2, error: err4 } = await supabase.from('emergency_alerts').select('*, profiles(*)').limit(1);
    console.log("Join Alerts->Profiles Result:", joinTest2 ? "SUCCESS" : "FAILED", err4);
}

deepInspect();
