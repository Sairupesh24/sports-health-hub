const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupAndCreateHrManager() {
  console.log('Synchronizing database schema for HR Manager role...');
  
  // 1. Ensure the role exists in the app_role enum
  const { error: sqlError } = await supabase.rpc('exec_sql', { 
    sql_query: "ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'hr_manager';" 
  });
  
  if (sqlError) {
    console.warn('Note: SQL execution via RPC failed, might needing manual run.');
  }

  // 2. Find the organization
  const { data: orgs, error: orgError } = await supabase
    .from('organizations')
    .select('id, name')
    .ilike('name', '%Test Clinic Fixed%');
  
  if (orgError) {
    console.error('Error fetching organizations:', orgError);
    return;
  }

  const targetOrg = orgs[0];
  if (!targetOrg) {
    console.error('Test Clinic organization not found.');
    return;
  }

  console.log(`Targeting organization: ${targetOrg.name} (${targetOrg.id})`);

  const email = 'hr@testclinic.com';
  const password = 'password123';

  // 3. Create/Update Auth User
  let userId;
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: 'HR', last_name: 'Manager' }
  });

  if (authError) {
    if (authError.message.includes('already been registered') || authError.code === 'email_exists') {
      console.log('User already exists, checking for existing identity...');
      // Try to find by email
      const { data: authList } = await supabase.auth.admin.listUsers();
      const existingUser = authList.users.find(u => u.email === email);
      if (existingUser) {
          userId = existingUser.id;
      }
    } else {
      console.error('Error creating auth user:', authError);
      return;
    }
  } else {
    userId = authData.user.id;
  }

  if (!userId) {
     console.error('Could not determine User ID.');
     return;
  }

  console.log(`User ID determined: ${userId}`);

  // 4. Create/Update Profile
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      organization_id: targetOrg.id,
      first_name: 'HR',
      last_name: 'Manager',
      email: email,
      is_approved: true
    });

  if (profileError) {
    console.error('Error creating profile:', profileError);
    return;
  }

  // 5. Assign hr_manager role
  const { error: roleError } = await supabase
    .from('user_roles')
    .upsert({
      user_id: userId,
      role: 'hr_manager'
    });

  if (roleError) {
    console.error('Error assigning role:', roleError);
    return;
  }

  console.log('✅ HR Manager account setup complete!');
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
}

setupAndCreateHrManager();
