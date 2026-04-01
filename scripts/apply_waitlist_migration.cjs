const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  console.log('Reading migration file...')
  const sqlContent = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20270402000000_appointment_remodel.sql'), 'utf8')
  
  console.log('Running migration...')
  // Split SQL by semicolon and filter out empty strings to run one by one if exec_sql doesn't support multi-statements
  // But usually exec_sql is a custom wrapper that can run a whole block.
  // Let's try running the whole block first.
  
  const { error } = await supabase.rpc('exec_sql', {
    sql_query: sqlContent
  })

  if (error) {
    console.error('Migration failed:', error)
    // If it failed because of multi-statements, we could split it, but let's see.
  } else {
    console.log('Migration successful!')
  }
}

runMigration()
