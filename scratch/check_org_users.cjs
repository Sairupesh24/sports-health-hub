const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = "https://zodzxzfkacpnnltoiiic.supabase.co"
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvZHp4emZrYWNwbm5sdG9paWljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTcyNzc5OSwiZXhwIjoyMDkxMzAzNzk5fQ.ucJgMU36a5ucn8nuznsGNSGwMsWoJ5vhzF7PjBlRBoY"

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function checkOrgUsers() {
  const orgId = '8e30a9ab-490b-4b2a-a166-d033ab089280' // ID for 9C1F95

  try {
    const { data: profiles, error: pError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, organization_id')
      .eq('organization_id', orgId)

    if (pError) throw pError

    console.log(`Profiles in Org ${orgId}:`)
    for (const p of profiles) {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', p.id)
      
      console.log(`- ${p.email} (${p.first_name} ${p.last_name}): Roles: ${roles?.map(r => r.role).join(', ') || 'NONE'}`)
    }

  } catch (err) {
    console.error('ERROR:', err.message)
  }
}

checkOrgUsers()
