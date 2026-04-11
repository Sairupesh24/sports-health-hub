const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupStorage() {
  console.log('Setting up storage bucket "clinic-logos"...')
  
  const { data, error } = await supabase.storage.createBucket('clinic-logos', {
    public: true,
    fileSizeLimit: 1024 * 1024 * 5, // 5MB
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml']
  })

  if (error) {
    if (error.message.includes('already exists')) {
      console.log('Bucket already exists.')
    } else {
      console.error('Error creating bucket:', error.message)
      process.exit(1)
    }
  } else {
    console.log('Bucket created successfully:', data)
  }

  process.exit(0)
}

setupStorage()
