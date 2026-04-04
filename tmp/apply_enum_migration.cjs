const { createClient } = require('@supabase/supabase-js');

// Using the same credentials found in the project's scripts
const sb = createClient(
  'https://fbjlgepxbyoyradaacvd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg'
);

async function applyMigration() {
  console.log('Applying specialized consultant roles to app_role enum...');
  
  // PostgreSQL ENUM values must be added one by one because 
  // ALTER TYPE ... ADD VALUE cannot run inside a transaction block 
  // (which many RPC handlers implicitly use if not careful, 
  // but let's try them individually anyway).
  
  const roles = ['sports_physician', 'physiotherapist', 'nutritionist'];
  
  for (const role of roles) {
    console.log(`  Adding role: ${role}...`);
    const sql = `ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS '${role}';`;
    
    // We use the exec_sql_query RPC which seems to be available in this project
    const { data, error } = await sb.rpc('exec_sql_query', { query: sql });
    
    if (error) {
      console.error(`  ❌ Error adding ${role}:`, error.message);
    } else {
      console.log(`  ✅ Successfully added ${role}`);
    }
  }
  
  console.log('Migration complete.');
}

applyMigration().catch(console.error);
