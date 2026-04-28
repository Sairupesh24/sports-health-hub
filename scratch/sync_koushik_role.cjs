const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = "https://zodzxzfkacpnnltoiiic.supabase.co"
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvZHp4emZrYWNwbm5sdG9paWljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTcyNzc5OSwiZXhwIjoyMDkxMzAzNzk5fQ.ucJgMU36a5ucn8nuznsGNSGwMsWoJ5vhzF7PjBlRBoY"

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function syncRole() {
  const email = 'knkoushik@gmail.com'
  const role = 'sports_physician'

  try {
    // 1. Find user in auth
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) throw listError

    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase())
    if (!user) {
      console.log(`User ${email} not found in Auth.`)
      return
    }

    console.log(`Found user: ${user.id}`)

    // 2. Add role
    const { data, error } = await supabase
      .from('user_roles')
      .upsert({ user_id: user.id, role: role }, { onConflict: 'user_id, role' })

    if (error) {
      console.error(`Error adding role: ${error.message}`)
    } else {
      console.log(`SUCCESS: Role '${role}' added for ${email}.`)
    }

  } catch (err) {
    console.error('ERROR:', err.message)
  }
}

syncRole()
