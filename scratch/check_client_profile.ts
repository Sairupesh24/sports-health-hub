import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  "https://fbjlgepxbyoyradaacvd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg"
);

async function checkClientProfile() {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('email', 'client3445@ishpo.com')
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return;
  }

  console.log('--- Profile for client3445@ishpo.com ---');
  console.log('ID:', profile.id);
  console.log('Role:', profile.role);
  console.log('AMS Role:', profile.ams_role);
  console.log('---------------------------------------');
}

checkClientProfile();
