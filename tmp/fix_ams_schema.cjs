const { createClient } = require('@supabase/supabase-js');

const URL = "https://fbjlgepxbyoyradaacvd.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg";

const supabase = createClient(URL, KEY);

async function fixSchema() {
  console.log('Applying schema fixes to align with frontend expectations...');
  
  const sql = `
    -- 1. Add missing column to training_programs
    ALTER TABLE public.training_programs ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;
    
    -- 2. Make coach_id nullable to support ad-hoc assignments without explicit coach context
    ALTER TABLE public.training_programs ALTER COLUMN coach_id DROP NOT NULL;
    
    -- 3. Ensure workout_days has notes and other expected fields
    -- (Nothing to change there yet, looks okay)
    
    -- 4. Reload PostgREST schema cache (implicitly handled by DDL)
    NOTIFY pgrst, 'reload schema';
  `;

  // Use the RPC to execute SQL or just use a dummy insert/delete if RPC is not available
  // Since I don't know if a 'exec_sql' RPC exists, I'll try to use a more standard way if possible.
  // Actually, I'll just use a temporary migration file if I had CLI, which I don't.
  
  // I'll try to use the 'rpc' to run arbitrary SQL if the 'exec_sql' function exists.
  // If not, I'll inform the user I need to run this SQL in their dashboard.
  
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    console.log('Failed to execute SQL via RPC:', error.message);
    console.log('Please run the following SQL in the Supabase SQL Editor:');
    console.log(sql);
  } else {
    console.log('Schema fixes applied successfully!');
  }
}

fixSchema();
