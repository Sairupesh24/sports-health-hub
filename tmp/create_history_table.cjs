const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fbjlgepxbyoyradaacvd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const SQL = `
CREATE TABLE IF NOT EXISTS public.client_therapist_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.client_therapist_history ENABLE ROW LEVEL SECURITY;

-- Read policy: Anyone in the same organization (simplified for test environment)
CREATE POLICY "Allow authenticated read for history" ON public.client_therapist_history
FOR SELECT TO authenticated USING (true);

-- Insert policy: Anyone authenticated (ideally restricted to admins/staff)
CREATE POLICY "Allow authenticated insert for history" ON public.client_therapist_history
FOR INSERT TO authenticated WITH CHECK (true);

-- Add index
CREATE INDEX IF NOT EXISTS idx_ct_history_client ON public.client_therapist_history(client_id);
`;

async function run() {
  console.log('Creating client_therapist_history table...');
  const { error } = await supabase.rpc('exec_sql', { sql_query: SQL });
  if (error) {
    console.error('❌ Table creation failed:', error);
  } else {
    console.log('✅ client_therapist_history table created successfully!');
  }
}

run();
