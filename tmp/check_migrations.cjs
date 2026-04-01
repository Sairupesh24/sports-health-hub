const { createClient } = require('@supabase/supabase-js');
const sb = createClient('https://fbjlgepxbyoyradaacvd.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg');

async function check() {
  const { data, error } = await sb.rpc('exec_sql', { 
    sql_query: "SELECT version FROM supabase_migrations.schema_migrations" 
  });
  if (error) {
    console.error('ERR:', error.message);
  } else {
    // If it returns results, they might be in data
    console.log('DATA:', JSON.stringify(data));
  }
}

check();
