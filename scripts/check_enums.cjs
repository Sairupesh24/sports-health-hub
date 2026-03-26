const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkEnums() {
  console.log('Checking Enums...');
  
  const sql = `
    SELECT t.typname, e.enumlabel
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname IN ('app_role', 'ams_role')
    ORDER BY t.typname, e.enumsortorder

  `;

  const { data, error } = await supabase.rpc('exec_sql_query', {
    sql_query: sql
  })

  // Wait, I might need 'exec_sql_query' if I want results.
  // Let me check if I have 'exec_sql_query'.
  
  if (error) {
    console.error('Check failed:', error.message);
  } else {
    console.log('Enum Values:', JSON.stringify(data, null, 2));
  }
}

checkEnums()
