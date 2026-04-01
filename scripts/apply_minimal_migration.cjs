const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMinimalMigration() {
  console.log('Applying minimal migration (Columns Only)...')
  
  const sql = `
    DO $$ 
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_category') THEN
            CREATE TYPE public.document_category AS ENUM (
                'Exercise Charts', 
                'Scan Reports', 
                'Insurance', 
                'Consent Forms', 
                'Prescriptions', 
                'Other'
            );
        END IF;
    END $$;

    ALTER TABLE public.client_documents 
    ADD COLUMN IF NOT EXISTS category public.document_category DEFAULT 'Other',
    ADD COLUMN IF NOT EXISTS access_level TEXT DEFAULT 'Medical_Staff_Only',
    ADD COLUMN IF NOT EXISTS uploaded_by_role TEXT,
    ADD COLUMN IF NOT EXISTS notes TEXT;
  `;

  const { data, error } = await supabase.rpc('exec_sql', {
    sql_query: sql
  })

  if (error) {
    console.error('Minimal migration failed:', error)
  } else {
    console.log('Minimal migration successful!')
  }
}

applyMinimalMigration()
