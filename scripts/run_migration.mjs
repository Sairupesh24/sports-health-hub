import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  console.log('Running migration...')
  // We'll try to use a common RPC if it exists, otherwise we'll try a table update as a proxy to check if we can reach the DB
  // Typically people add an 'exec_sql' RPC for this. If not, this might fail with "function not found".
  const { error } = await supabase.rpc('exec_sql', {
    sql_query: 'ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;'
  })

  if (error) {
    console.error('Migration failed:', error)
    if (error.message.includes('function "public.exec_sql" does not exist')) {
        console.log('NOTICE: The exec_sql function is missing. You may need to run the SQL manually in the Supabase Dashboard.')
    }
  } else {
    console.log('Migration successful!')
  }
}

runMigration()
