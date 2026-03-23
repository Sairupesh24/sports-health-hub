import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://fbjlgepxbyoyradaacvd.supabase.co";
const supabaseServiceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg";

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function run() {
  try {
    console.log("Checking App Roles...");
    const { data: roles, error: rolesErr } = await supabase.from('user_roles').select('*');
    if (rolesErr) console.error("Roles Error:", rolesErr);
    
    console.log("Checking Profiles...");
    const { data: profiles, error: profsErr } = await supabase.from('profiles').select('*');
    if (profsErr) console.error("Profiles Error:", profsErr);

    console.log("Checking Organizations...");
    const { data: orgs, error: orgsErr } = await supabase.from('organizations').select('*');
    if (orgsErr) console.error("Orgs Error:", orgsErr);

    const data = {
      roles,
      profiles: profiles?.map(p => ({
        id: p.id,
        email: p.email,
        first_name: p.first_name,
        last_name: p.last_name,
        is_approved: p.is_approved,
        organization_id: p.organization_id
      })),
      orgs
    };

    console.log(JSON.stringify(data, null, 2));

  } catch (err) {
    console.error('Error:', err.message);
  }
}

run();
