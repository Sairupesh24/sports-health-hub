const { createClient } = require('@supabase/supabase-js');

// Manually inserting credentials as dotenv isn't available in this environment
const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseDuplicates() {
  console.log('--- Checking Profiles ---');
  const { data: profiles, error: pError } = await supabase.from('profiles').select('id, email, first_name, last_name, is_approved');
  if (pError) console.error(pError);
  
  const emailCounts = {};
  profiles?.forEach(p => {
    emailCounts[p.email] = (emailCounts[p.email] || 0) + 1;
  });
  
  console.log('Duplicate Emails in Profiles:');
  Object.entries(emailCounts).filter(([email, count]) => count > 1).forEach(([email, count]) => {
    console.log(`  ${email}: ${count} entries`);
    profiles.filter(p => p.email === email).forEach(p => {
      console.log(`    - ID: ${p.id}, Name: ${p.first_name} ${p.last_name}, Approved: ${p.is_approved}`);
    });
  });

  console.log('\n--- Checking Auth Users ---');
  const { data: { users: authUsers }, error: aError } = await supabase.auth.admin.listUsers();
  if (aError) console.error(aError);
  
  const authEmailCounts = {};
  authUsers?.forEach(u => {
    authEmailCounts[u.email] = (authEmailCounts[u.email] || 0) + 1;
  });
  
  console.log('Duplicate Emails in Auth:');
  Object.entries(authEmailCounts).filter(([email, count]) => count > 1).forEach(([email, count]) => {
    console.log(`  ${email}: ${count} entries`);
  });

  console.log('\n--- Orphaned Profiles (No Auth User) ---');
  profiles?.forEach(p => {
    if (!authUsers.some(u => u.id === p.id)) {
      console.log(`  Profile with email ${p.email} (ID: ${p.id}) has no auth user.`);
    }
  });

  console.log('\n--- Orphaned Auth Users (No Profile) ---');
  authUsers?.forEach(u => {
    if (!profiles.some(p => p.id === u.id)) {
      console.log(`  Auth user with email ${u.email} (ID: ${u.id}) has no profile.`);
    }
  });
}

diagnoseDuplicates();
