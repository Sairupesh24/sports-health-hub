require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function getOrgCode() {
  const { data, error } = await supabase
    .from('organizations')
    .select('org_code, name')
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching org code:', error);
    return;
  }

  console.log('Org Code:', data.org_code);
  console.log('Org Name:', data.name);
}

getOrgCode();
