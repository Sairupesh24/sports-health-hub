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

console.log(`Using Service Role Key to bypass RLS for project: ${ref}...`);

const supabase = createClient(supabaseUrl, rawKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function extractCredentials() {
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error('Failed to list auth.users:', authError.message);
    return;
  }

  const authUsers = authData.users || [];
  
  const { data: profiles, error: pError } = await supabase.from('profiles').select('id, first_name, last_name, organization_id');
  const { data: roles, error: rError } = await supabase.from('user_roles').select('user_id, role');
  const { data: orgs, error: oError } = await supabase.from('organizations').select('id, name');

  const orgMap = {};
  if (orgs) orgs.forEach(o => orgMap[o.id] = o.name);

  const roleMap = {};
  if (roles) roles.forEach(r => roleMap[r.user_id] = r.role);

  const profileMap = {};
  if (profiles) profiles.forEach(p => profileMap[p.id] = p);

  console.log('\n======================================================');
  console.log('             VALID LOGIN CREDENTIALS DATABASE           ');
  console.log('======================================================\n');
  
  const creds = authUsers.map(u => {
    const p = profileMap[u.id] || {};
    const r = roleMap[u.id] || 'None';
    const o = orgMap[p.organization_id] || 'None';
    
    return {
      Email: u.email,
      Name: `${p.first_name || 'N/A'} ${p.last_name || ''}`.trim(),
      Role: r,
      Org: o,
      Confirmed: !!u.email_confirmed_at
    };
  });

  fs.writeFileSync('creds_output.json', JSON.stringify(creds, null, 2), 'utf-8');
  console.log("Successfully wrote output to creds_output.json");
}

extractCredentials();
