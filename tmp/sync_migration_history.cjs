const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';
const sb = createClient(supabaseUrl, supabaseServiceKey);

async function sync() {
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
  const versions = files.map(f => f.split('_')[0]);
  
  console.log(`Found ${versions.length} local migrations.`);
  
  for (const v of versions) {
    if (v.length !== 14 || isNaN(v)) {
       console.log(`Skipping invalid version: ${v}`);
       continue;
    }
    
    const { error } = await sb.rpc('exec_sql', {
      sql_query: `INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('${v}') ON CONFLICT (version) DO NOTHING;`
    });
    
    if (error) {
      console.error(`Failed to sync ${v}:`, error.message);
    }
  }
  console.log('✅ Synchronization of migration history complete.');
}

sync();
