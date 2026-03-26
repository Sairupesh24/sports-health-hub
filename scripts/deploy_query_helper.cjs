const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function deployQueryHelper() {
  console.log('Deploying exec_sql_query helper...');
  
  const sql = `
    CREATE OR REPLACE FUNCTION exec_sql_query(sql_query text)
    RETURNS JSON AS $$
    DECLARE
      v_result JSON;
    BEGIN
      EXECUTE 'SELECT array_to_json(array_agg(t)) FROM (' || sql_query || ') t' INTO v_result;
      RETURN COALESCE(v_result, '[]'::json);
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;

  const { error } = await supabase.rpc('exec_sql', {
    sql_query: sql
  })

  if (error) {
    console.error('Deployment failed:', error.message);
  } else {
    console.log('Deployment successful!');
  }
}

deployQueryHelper()
