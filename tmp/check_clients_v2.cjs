const { createClient } = require('@supabase/supabase-js');
const PROJECT_REF = 'fbjlgepxbyoyradaacvd';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';

const supabase = createClient(`https://${PROJECT_REF}.supabase.co`, SERVICE_KEY);

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
    const { data: clients, error: cError, count } = await supabase
      .from('clients')
      .select('id, first_name, last_name', { count: 'exact' })
      .eq('organization_id', profile.organization_id);
    
    if (cError) console.error("Client Error:", cError);
    console.log(`Client count for org ${profile.organization_id}:`, count);
    console.log("Clients (sample):", JSON.stringify(clients, null, 2));
  } else if (profile) {
    console.log("Profile exists but organization_id is NULL.");
  } else {
    console.log("Profile not found.");
  }

  // Also check auth user
  const { data: { users }, error: uError } = await supabase.auth.admin.listUsers();
  const user = users.find(u => u.email === email);
  console.log("Auth User ID:", user?.id);
  if (user && profile && user.id !== profile.id) {
    console.log("⚠️ ID Mismatch! Auth ID:", user.id, "Profile ID:", profile.id);
  }
}

check();
