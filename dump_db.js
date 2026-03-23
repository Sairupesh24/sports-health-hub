import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = "https://fbjlgepxbyoyradaacvd.supabase.co";
const supabaseServiceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg";

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function run() {
  try {
    const { data: roles } = await supabase.from('user_roles').select('*');
    const { data: profiles } = await supabase.from('profiles').select('*');
    const { data: orgs } = await supabase.from('organizations').select('*');

    const result = {
      roles,
      profiles: profiles?.map(p => ({
        id: p.id,
        email: p.email,
        first_name: p.first_name,
        last_name: p.last_name,
        is_approved: p.is_approved,
        organization_id: p.organization_id
      })),
      orgs: orgs?.map(o => ({
        id: o.id,
        name: o.name,
        join_code: o.join_code
      }))
    };

    fs.writeFileSync('db_dump.json', JSON.stringify(result, null, 2));
    console.log("Dumped to db_dump.json");
  } catch (err) {
    console.error('Error:', err.message);
  }
}

run();
