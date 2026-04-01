const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error("SUPABASE_SERVICE_ROLE_KEY missing");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const email = 'test_clinic_admin@ishpo.com';
  console.log(`Checking profile for: ${email}`);
  
  const { data: profile, error: pError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (pError) console.error("Profile Error:", pError);
  console.log("Profile Data:", JSON.stringify(profile, null, 2));

  if (profile?.organization_id) {
    const { count, error: cError } = await supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', profile.organization_id);
    
    if (cError) console.error("Client Count Error:", cError);
    console.log(`Client count for org ${profile.organization_id}:`, count);

    const { data: clients } = await supabase
      .from('clients')
      .select('id, first_name, last_name')
      .eq('organization_id', profile.organization_id)
      .limit(5);
    console.log("Clients (sample):", JSON.stringify(clients, null, 2));
  } else if (profile) {
    console.log("Profile exists but organization_id is NULL.");
  } else {
    console.log("Profile not found.");
  }
}

check();
