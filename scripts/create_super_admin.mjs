import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envText = fs.readFileSync('.env', 'utf-8');
const envMatchesKey = envText.match(/VITE_SUPABASE_SERVICE_ROLE_KEY\s*=\s*[\"']?([^\"'\n\r]+)[\"']?/);
let rawKey = envMatchesKey ? envMatchesKey[1] : '';

// Fix accidental 's' character prefix
if (rawKey.startsWith('seyJ')) {
  rawKey = rawKey.substring(1);
}

const parts = rawKey.split('.');
if (parts.length !== 3) {
  console.error("The provided Service Role Key is not a valid JWT format.");
  process.exit(1);
}

const payloadString = Buffer.from(parts[1], 'base64').toString('utf-8');
const payload = JSON.parse(payloadString);
const ref = payload.ref;

const supabaseUrl = `https://${ref}.supabase.co`;

const supabase = createClient(supabaseUrl, rawKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function createSuperAdmin() {
  const email = 'new_master@ishpo.com';
  const password = 'password123';
  
  console.log(`Creating super admin: ${email}`);

  // 1. Create User
  const { data: authData, error: createErr } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true,
    user_metadata: { first_name: 'New', last_name: 'SuperAdmin' }
  });

  if (createErr) {
    if (createErr.message.includes('already exists')) {
        console.log("User already exists, fetching ID to ensure role is set...");
    } else {
        console.error('Failed to create auth user:', createErr.message);
        return;
    }
  }

  // Get user ID
  let userId;
  if (authData?.user?.id) {
      userId = authData.user.id;
  } else {
      const { data: existingUser } = await supabase.auth.admin.listUsers();
      const user = existingUser.users.find(u => u.email === email);
      if (user) {
          userId = user.id;
          // Ensure password is correct
          await supabase.auth.admin.updateUserById(userId, { password: password });
      } else {
          console.error("Could not trace user ID");
          return;
      }
  }

  // 2. Assign Super Admin Role
  const { error: roleErr } = await supabase.from('user_roles').upsert({
    user_id: userId,
    role: 'super_admin'
  }, { onConflict: 'user_id, role' });

  if (roleErr) {
      console.error("Failed to assign role:", roleErr.message);
      return;
  }

  // 3. Update Profile status
  const { error: profErr } = await supabase.from('profiles').update({
      is_approved: true,
      first_name: 'New',
      last_name: 'SuperAdmin'
  }).eq('id', userId);

  if (profErr) {
      console.log("Note: Profile update warning (might just be a trigger delay):", profErr.message);
  }

  console.log("=========================================");
  console.log("SUCCESS! Created new Super Admin account:");
  console.log(`Email:    ${email}`);
  console.log(`Password: ${password}`);
  console.log("Role:     super_admin");
  console.log("=========================================");
}

createSuperAdmin();
