const { createClient } = require('@supabase/supabase-js');

const URL = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';

const supabase = createClient(URL, SERVICE_KEY);

async function bruteForce() {
  const names = ['exec_sql', 'execute_sql', 'run_sql', 'sql', 'query_sql', 'apply_sql'];
  for (const name of names) {
    console.log(`Trying RPC: ${name}...`);
    const { data, error } = await supabase.rpc(name, { sql_query: 'SELECT 1', query: 'SELECT 1', sql: 'SELECT 1' });
    if (error) {
      if (error.code === 'PGRST202') {
         // Functions not found
      } else {
         console.log(`[!] ${name} exists but error:`, error.message);
      }
    } else {
      console.log(`[x] ${name} IS AVAILABLE! Data:`, data);
      return;
    }
  }
  console.log('No SQL execution RPC found.');
}

bruteForce();
