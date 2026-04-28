const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = "https://zodzxzfkacpnnltoiiic.supabase.co"
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvZHp4emZrYWNwbm5sdG9paWljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTcyNzc5OSwiZXhwIjoyMDkxMzAzNzk5fQ.ucJgMU36a5ucn8nuznsGNSGwMsWoJ5vhzF7PjBlRBoY"

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function checkAccount() {
  const email = 'knkoushik@gmail.com'
  const orgCode = '9C1F95'

  console.log(`Checking account ${email} and org ${orgCode}...`)

  try {
    // 1. Find the organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, org_code')
      .eq('org_code', orgCode)
      .single()

    if (orgError) {
      console.log(`Organization ${orgCode} fetch error: ${orgError.message}`)
    } else if (!org) {
      console.log(`Organization ${orgCode} not found.`)
    } else {
      console.log(`Found organization: ${org.name} (${org.id})`)
    }

    // 2. Find user in Auth
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) throw listError

    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase())
    
    if (user) {
      console.log(`User found in Auth: ${user.id}`)
      console.log(`User Metadata:`, JSON.stringify(user.user_metadata, null, 2))
      
      // 3. Find profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.log(`Profile fetch error: ${profileError.message}`)
      } else if (!profile) {
        console.log(`Profile not found for user ${user.id}`)
      } else {
        console.log(`Profile found:`, JSON.stringify(profile, null, 2))
        if (org && profile.organization_id === org.id) {
          console.log(`MATCH: User ${email} IS linked to organization ${orgCode} (${org.name})`)
        } else {
          console.log(`MISMATCH: User ${email} is linked to organization ID ${profile.organization_id}, expected ${org?.id}`)
        }
      }
      
      // 4. Check roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)

      if (rolesError) {
        console.log(`Roles fetch error: ${rolesError.message}`)
      } else {
        console.log(`Roles:`, roles.map(r => r.role).join(', '))
      }

    } else {
      console.log(`User ${email} NOT found in Auth.`)
    }

  } catch (err) {
    console.error('ERROR:', err.message)
  }
}

checkAccount()
