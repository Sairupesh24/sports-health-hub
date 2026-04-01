const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigration() {
  console.log('Reading migration file...')
  const filePath = path.join(__dirname, '../supabase/migrations/20270401150000_upgrade_client_documents_schema.sql')
  const sqlString = fs.readFileSync(filePath, 'utf8')

  console.log('Applying migration via RPC...')
  const { data, error } = await supabase.rpc('exec_sql', {
    sql_query: sqlString
  })

  if (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } else {
    console.log('Migration successfully applied!')
    console.log('Response:', data)
  }
}

applyMigration()
