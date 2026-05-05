import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data: user } = await supabase.auth.admin.listUsers();
  const testUser = user.users.find(u => u.email === 'scientist_test@example.com');
  if (!testUser) { console.log('User not found'); return; }

  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', testUser.id).single();
  if (!profile) { console.log('Profile not found'); return; }

  const { data: org } = await supabase.from('organizations').select('*').eq('id', profile.organization_id).single();
  console.log('Org Settings:', JSON.stringify(org, null, 2));
}
check();
