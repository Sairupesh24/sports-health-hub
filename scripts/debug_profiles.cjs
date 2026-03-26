const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugProfiles() {
  console.log('Comparing Auth and Profiles...');
  
  const sql = `
    SELECT 
      u.email as auth_email, 
      u.id as auth_id, 
      p.email as profile_email, 
      p.id as profile_id,
      p.first_name,
      p.last_name
    FROM auth.users u
    FULL OUTER JOIN public.profiles p ON u.email = p.email
    WHERE u.email LIKE '%@ishpo.com' OR p.email LIKE '%@ishpo.com'
  `;

  const { data, error } = await supabase.rpc('exec_sql_query', {
    sql_query: sql
  })

  if (error) {
    console.error('Check failed:', error.message);
  } else {
    console.log('Comparison Results:', JSON.stringify(data, null, 2));
  }
}

debugProfiles()
