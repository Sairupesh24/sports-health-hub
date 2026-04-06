const { createClient } = require('@supabase/supabase-js');
const sb = createClient('https://fbjlgepxbyoyradaacvd.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg');

async function moveDoctor() {
  const email = 'doctor3445@ishpo.com';
  const targetOrgId = '95d6393e-68ab-4839-9b35-a11562cfc150'; // ID from the screenshot users

  console.log(`Moving ${email} to Organization ID: ${targetOrgId}...`);

  const { error } = await sb
    .from('profiles')
    .update({ organization_id: targetOrgId })
    .eq('email', email);

  if (error) {
    console.error('Error moving user:', error.message);
  } else {
    console.log('Successfully moved user to the correct organization.');
  }
}

moveDoctor();
