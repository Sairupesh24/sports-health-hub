const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';

async function main() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    const sqlFiles = [
      '20270402160000_assigned_therapist_feature.sql',
      '20270402160500_therapist_availability_rpc.sql'
    ];
    
    for (const fileName of sqlFiles) {
      console.log(`Applying ${fileName}...`);
      const filePath = path.join(__dirname, '..', 'supabase', 'migrations', fileName);
      const sqlContent = fs.readFileSync(filePath, 'utf8');
      
      const { error } = await supabase.rpc('exec_sql', {
        sql_query: sqlContent
      });
      
      if (error) {
        console.error(`Failed to apply ${fileName}:`, error);
        throw error;
      }
      console.log(`✅ ${fileName} applied successfully via exec_sql.`);
    }

  } catch (err) {
    console.error('Error applying migration:', err.message || err);
  }
}

main();
