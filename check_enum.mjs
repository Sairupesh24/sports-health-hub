import { createClient } from '@supabase/supabase-js';

const URL = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';

const supabase = createClient(URL, SERVICE_KEY);

async function checkEnum() {
  console.log('--- Attempting to insert a dummy user role with super_admin ---');
  // Use a random UUID to avoid conflicts
  const dummyId = '00000000-0000-0000-0000-000000000000'; 
  
  const { data, error } = await supabase.from('user_roles').insert({
    user_id: dummyId,
    role: 'super_admin'
  });

  if (error) {
    console.error('Insert Error:', error.message);
    if (error.message.includes('invalid input value for enum')) {
        console.log('CRITICAL: super_admin role does NOT exist in app_role enum on remote server!');
    }
  } else {
    console.log('Success: super_admin role exists in enum.');
    // Cleanup
    await supabase.from('user_roles').delete().eq('user_id', dummyId);
  }
}

checkEnum();
