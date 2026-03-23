import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const URL = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';

const supabase = createClient(URL, SERVICE_KEY);

async function diag() {
  const { data: usersData } = await supabase.auth.admin.listUsers();
  const { data: rolesData } = await supabase.from('user_roles').select('*');
  const { data: profilesData } = await supabase.from('profiles').select('*');
  const { data: orgsData } = await supabase.from('organizations').select('*');
  
  const results = {
    users: (usersData?.users || []).map(u => ({ email: u.email, id: u.id })),
    roles: rolesData || [],
    profiles: profilesData || [],
    organizations: orgsData || []
  };

  fs.writeFileSync('diag_results.json', JSON.stringify(results, null, 2));
  console.log('Results written to diag_results.json');
}

diag();
