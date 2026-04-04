const { createClient } = require('@supabase/supabase-js');
const sb = createClient('https://fbjlgepxbyoyradaacvd.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg');

async function updateOrg() {
  const email = 'doctor3445@ishpo.com';
  // I need to ensure I use the ID for "Test Clinic Fixed" which was [6C18AF] 95d6393e-68ab-495d-9185-7cb9b1713e15
  const newOrgId = '95d6393e-68ab-495d-9185-7cb9b1713e15'; 

  console.log(`Updating organization for ${email} to "Test Clinic Fixed"...`);

  const { error } = await sb
    .from('profiles')
    .update({ organization_id: newOrgId })
    .eq('email', email);

  if (error) {
    console.error('Error updating organization:', error.message);
  } else {
    console.log('Successfully updated organization.');
  }
}

updateOrg();
