const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
  'https://fbjlgepxbyoyradaacvd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg'
);

async function checkOrg() {
  const { data, error } = await sb.from('organizations').select('id, name, org_code').eq('org_code', '273840').maybeSingle();
  if (error) {
    console.error('Error fetching org:', error.message);
    return;
  }
  if (!data) {
    console.log('Organization not found for code 273840. Checking all orgs...');
    const { data: all } = await sb.from('organizations').select('id, name, org_code');
    console.log(all);
  } else {
    console.log('Found Org:', data);
  }
}

checkOrg();
