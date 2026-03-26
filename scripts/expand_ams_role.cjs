const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function expandEnum() {
  console.log('Expanding ams_role enum...')
  
  // Note: IF NOT EXISTS is not supported for ADD VALUE in some versions, 
  // but we can use a DO block to be safe.
  const sql = `
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'sports_scientist' AND enumtypid = 'public.ams_role'::regtype) THEN
            ALTER TYPE public.ams_role ADD VALUE 'sports_scientist';
        END IF;
    END $$;
  `;

  const { error } = await supabase.rpc('exec_sql', {
    sql_query: sql
  })

  if (error) {
    if (error.message.includes('already exists')) {
        console.log('Role already exists.');
    } else {
        console.error('Enum expansion failed:', error);
    }
  } else {
    console.log('Enum expanded successfully!');
  }
}

expandEnum()
