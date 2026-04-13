import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function seedAdmin() {
  const email = 'abhi79111@gmail.com'
  const password = 'Cssh@2024'
  const orgCode = '9C1F95'

  console.log(`Starting seeding for ${email} in org ${orgCode}...`)

  // 1. Find the organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('org_code', orgCode)
    .single()

  if (orgError || !org) {
    console.error('Error finding organization:', orgError?.message || 'Not found')
    process.exit(1)
  }

  console.log(`Found organization: ${org.name} (${org.id})`)

  // 2. Find or update the user in auth.users
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) {
    console.error('Error listing users:', listError.message)
    process.exit(1)
  }

  const existingUser = users.find(u => u.email === email)
  let userId = ''

  if (existingUser) {
    console.log(`User ${email} already exists. Updating password...`)
    const { data: userData, error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
      password: password,
      email_confirm: true,
      user_metadata: { organization_id: org.id }
    })
    
    if (updateError) {
      console.error('Error updating user:', updateError.message)
      process.exit(1)
    }
    userId = userData.user.id
  } else {
    console.log(`User ${email} not found. Creating new user...`)
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { organization_id: org.id }
    })

    if (createError) {
      console.error('Error creating user:', createError.message)
      process.exit(1)
    }
    userId = userData.user.id
  }

  console.log(`User identity verified: ${userId}`)

  // 3. Ensure profile exists and is linked
  console.log('Syncing profile...')
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      organization_id: org.id,
      is_approved: true
    }, { onConflict: 'id' })

  if (profileError) {
    console.error('Error syncing profile:', profileError.message)
  }

  // 4. Ensure admin role
  console.log('Ensuring admin role...')
  const { error: roleError } = await supabase
    .from('user_roles')
    .upsert({
      user_id: userId,
      role: 'admin'
    }, { onConflict: 'user_id, role' })

  if (roleError) {
    console.error('Error assigning role:', roleError.message)
  }

  console.log('Seeding completed successfully!')
}

seedAdmin()
