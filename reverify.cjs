const { createClient } = require('@supabase/supabase-js');

const URL = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';

const supabase = createClient(URL, SERVICE_KEY);

async function checkTables() {
  const tables = ['session_templates', 'group_attendance', 'session_facts', 'session_types'];
  for (const t of tables) {
    console.log(`Checking ${t}...`);
    const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
    if (error) {
       console.log(`${t} Error:`, JSON.stringify(error, null, 2));
    } else {
       console.log(`${t} Success, Count: ${count}`);
    }
  }
}

checkTables();
