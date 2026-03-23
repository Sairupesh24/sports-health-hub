import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://fbjlgepxbyoyradaacvd.supabase.co";
const supabaseServiceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg";

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function run() {
  try {
    console.log("Checking for 'get_enum_values' RPC...");
    const { data: rpcData, error: rpcErr } = await supabase.rpc('get_enum_values', { enum_name: 'app_role' });
    
    if (rpcErr) {
      console.log("RPC failed or missing:", rpcErr.message);
    } else {
      console.log("Enum values from RPC:", rpcData);
    }

    console.log("\nAttempting to query pg_enum via a trick (if any view is available)...");
    // Some systems have a custom view for this. Let's try to list tables/views
    const { data: tables } = await supabase.from('pg_catalog.pg_tables' as any).select('*').limit(1);
    console.log("Can access pg_catalog?", !!tables);

    // Final check: Let's try to list members and their roles again
    const { data: roles } = await supabase.from('user_roles').select('role').limit(10);
    const uniqueRoles = [...new Set(roles?.map(r => r.role))];
    console.log("Currently active roles in user_roles table:", uniqueRoles);

  } catch (err) {
    console.error('Error:', err.message);
  }
}

run();
