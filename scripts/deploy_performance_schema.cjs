const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function deploySchema() {
  console.log('Deploying Performance Assessment Schema...')
  
  const sqlPath = path.join(__dirname, '../supabase/migrations/20270106000001_performance_assessments.sql')
  const sql = fs.readFileSync(sqlPath, 'utf8')

  const { error } = await supabase.rpc('exec_sql', {
    sql_query: sql
  })

  if (error) {
    console.error('Deployment failed:', error)
    if (error.message.includes('exec_sql')) {
        console.log('Note: RPC "exec_sql" might be missing or named differently (e.g. sql_query).')
    }
  } else {
    console.log('Deployment successful!')
  }
}

deploySchema()
