import { createClient } from '@supabase/supabase-js'

// Hardcoded values from your .env to ensure it runs correctly in this environment
const supabaseUrl = "https://zodzxzfkacpnnltoiiic.supabase.co"
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvZHp4emZrYWNwbm5sdG9paWljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTcyNzc5OSwiZXhwIjoyMDkxMzAzNzk5fQ.ucJgMU36a5ucn8nuznsGNSGwMsWoJ5vhzF7PjBlRBoY"

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function seedAdmin() {
  const email = 'abhi79111@gmail.com'
  const password = 'Cssh@2024'
  const orgCode = '9C1F95'

  console.log(`Starting production seeding for ${email} in org ${orgCode}...`)

  try {
    // 1. Find the organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('org_code', orgCode)
      .single()

    if (orgError || !org) {
      throw new Error(`Organization ${orgCode} not found: ${orgError?.message}`)
    }

    console.log(`Found organization: ${org.name} (${org.id})`)

    // 2. Update user password and metadata
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) throw listError

    let userId = ''
    const existingUser = users.find(u => u.email === email)
    
    if (existingUser) {
      console.log(`User ${email} found. Updating password...`)
      const { data: userData, error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
        password: password,
        email_confirm: true,
        user_metadata: { organization_id: org.id }
      })
      if (updateError) throw updateError
      userId = userData.user.id
    } else {
      console.log(`User ${email} not found. Creating new user in Auth...`)
      const { data: userData, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { organization_id: org.id }
      })
      if (createError) throw createError
      userId = userData.user.id
    }

    console.log(`User identity established: ${userId}`)

    // 3. Ensure profile is linked
    console.log('Syncing profile...')
    const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
            organization_id: org.id,
            is_approved: true
        })
        .eq('id', userId)

    if (profileError) console.warn('Profile update warning:', profileError.message)

    // 4. Ensure admin role
    console.log('Ensuring admin role...')
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userId,
        role: 'admin'
      }, { onConflict: 'user_id, role' })

    if (roleError) console.warn('Role assignment warning:', roleError.message)

    console.log('\nSUCCESS: Seeding completed!')
    console.log(`Email: ${email}`)
    console.log(`Password: ${password}`)
    console.log('You can now log in at your branded ISHPO portal.')

  } catch (err: any) {
    console.error('\nERROR:', err.message)
    process.exit(1)
  }
}

seedAdmin()
