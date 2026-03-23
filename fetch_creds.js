import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aobtwbhqtlyvfczovdvj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvYnR3YmhxdGx5dmZjem92ZHZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNTczNzksImV4cCI6MjA4NzgzMzM3OX0.exy21x6h2ZpdV_bmTLzC0l8s3SWgNR0xfeWuelyNkeM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchAll() {
  console.log('Logging in as master admin...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'masteradmin@ishpo.com',
    password: 'superadmin123'
  });

  if (authError) {
    console.error('Login Failed:', authError);
    return;
  }
  
  console.log('Logged in successfully! Fetching profiles...');
  const { data: profiles, error: pError } = await supabase.from('profiles').select('id, first_name, last_name, email, organization_id');
  if (pError) console.error('Profiles Error:', pError);

  console.log('Fetching roles...');
  const { data: roles, error: rError } = await supabase.from('user_roles').select('user_id, role');
  if (rError) console.error('Roles Error:', rError);

  console.log('Fetching organizations...');
  const { data: orgs, error: oError } = await supabase.from('organizations').select('id, name');
  if (oError) console.error('Orgs Error:', oError);

  if (!profiles || profiles.length === 0) {
    console.log('No profiles found, or RLS blocked reading other profiles even for this admin.');
    return;
  }

  const orgMap = {};
  if (orgs) orgs.forEach(o => orgMap[o.id] = o.name);

  const roleMap = {};
  if (roles) roles.forEach(r => roleMap[r.user_id] = r.role);

  console.log('\n--- ALL USERS DUMP ---');
  profiles.forEach(p => {
    console.log(`Email: ${p.email}`);
    console.log(`Name:  ${p.first_name || ''} ${p.last_name || ''}`.trim());
    console.log(`Role:  ${roleMap[p.id] || 'None'}`);
    console.log(`Org:   ${orgMap[p.organization_id] || 'None'}`);
    console.log('----------------------');
  });
}

fetchAll();
