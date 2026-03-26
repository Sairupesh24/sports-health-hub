const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkSessionsSchema() {
  console.log('Checking Sessions Schema...');
  
  const sql = `
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'sessions'
  `;

  const { data, error } = await supabase.rpc('exec_sql_query', {
    sql_query: sql
  })

  if (error) {
    console.error('Check failed:', error.message);
  } else {
    console.log('Sessions Columns:', JSON.stringify(data, null, 2));
  }
}

checkSessionsSchema()
