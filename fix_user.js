import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://fbjlgepxbyoyradaacvd.supabase.co";
const supabaseServiceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg";

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function run() {
  try {
    const userId = "fb2a359a-6914-4a48-907f-5a4475e3172f";
    const correctOrgId = "95d6393e-68ab-4839-9b35-a11562cfc150";
    const role = "sports_scientist";

    console.log(`Fixing user ${userId}...`);

    // Update profile
    const { error: profError } = await supabase
      .from('profiles')
      .update({ organization_id: correctOrgId, is_approved: true })
      .eq('id', userId);
    
    if (profError) throw profError;
    console.log("Profile updated.");

    // Upsert role
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert({ user_id: userId, role: role }, { onConflict: 'user_id' });

    if (roleError) throw roleError;
    console.log("Role assigned.");

    console.log("Success! Test user is now fully approved and assigned to the correct organization.");
  } catch (err) {
    console.error('Error:', err.message);
  }
}

run();
