// WORKAROUND: Fix the broken trigger by dropping it entirely, then
// manually managing profile creation in the application layer.
// 
// Since we cannot modify the trigger via JS APIs, we'll:
// 1. Use Supabase's official Management API (v1) to run SQL
// 2. The Management API requires a personal access token, not service role
//
// ALTERNATIVE APPROACH: Instead of fixing the trigger, pre-populate the 
// profiles table entry BEFORE creating the auth user. The trigger will 
// then hit ON CONFLICT and do nothing (if the trigger has it), or fail.
//
// FINAL APPROACH: Use Supabase's signUp with email confirmation token bypass.
// The issue is: the TRIGGER itself has a bug causing the INSERT to fail.
// Let's see what the existing trigger looks like by checking profiles inserted 
// for existing users.

const { createClient } = require('@supabase/supabase-js');
const sb = createClient(
  'https://fbjlgepxbyoyradaacvd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg'
);

async function checkExistingProfile() {
  // Get the super admin user's profile to see what the trigger created
  const { data: { users } } = await sb.auth.admin.listUsers();
  console.log('Total auth users:', users.length);
  
  // Show the profile for the super admin
  const superAdmin = users.find(u => u.email === 'testuser1772708483495@gmail.com');
  if (superAdmin) {
    const { data: p } = await sb.from('profiles').select('*').eq('id', superAdmin.id).single();
    console.log('Super admin profile:', JSON.stringify(p, null, 2));
  }

  // Check if there's a unique constraint or NOT NULL constraint issue in profiles
  // by trying a manual insert with minimal fields
  const { data: { user: testUser }, error: signupErr } = await sb.auth.admin.createUser({
    email: 'probe_minimal_' + Date.now() + '@ishpo.com',
    password: 'password123',
    email_confirm: true,
  });

  if (signupErr) {
    console.log('\nMinimal user creation failed:', signupErr.message);
    
    // The trigger is likely failing because the profiles table has a NOT NULL column
    // that the trigger doesn't populate. Let's check by getting the table schema.
    const { data: profileCols } = await sb.rpc('exec_sql_query', {
      query: `SELECT column_name, data_type, is_nullable, column_default 
              FROM information_schema.columns 
              WHERE table_schema='public' AND table_name='profiles' 
              ORDER BY ordinal_position`
    });
    console.log('\nProfiles schema:', JSON.stringify(profileCols, null, 2));
  } else {
    console.log('\n✅ User creation works now! Probe user ID:', testUser.id);
    await sb.auth.admin.deleteUser(testUser.id);
  }
}

checkExistingProfile().catch(console.error);
