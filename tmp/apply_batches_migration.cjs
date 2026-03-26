const https = require('https');

const PROJECT_REF = 'fbjlgepxbyoyradaacvd';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiamxnZXB4YnlveXJhZGFhY3ZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ0Mzk4NSwiZXhwIjoyMDg4MDE5OTg1fQ.85pkS0NHT5zr7Fs6SDc_A2C6rFSMGLO6HdC2HITcOTg';

async function execSQL(sql) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query: sql });
    const options = {
      hostname: `${PROJECT_REF}.supabase.co`,
      path: '/rest/v1/sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
      },
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

const BATCH_SQL = `
-- 1. Batches table
CREATE TABLE IF NOT EXISTS public.batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(org_id, name)
);

-- 2. Batch Members table
CREATE TABLE IF NOT EXISTS public.batch_members (
    batch_member_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
    athlete_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (batch_id, athlete_id)
);

-- 3. Modify program_assignments to support batch_id
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'program_assignments' AND COLUMN_NAME = 'batch_id') THEN
        ALTER TABLE public.program_assignments ADD COLUMN batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE;
    END IF;
    
    ALTER TABLE public.program_assignments ALTER COLUMN athlete_id DROP NOT NULL;
END $$;

-- 4. RLS for Batches
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org access for batches" ON public.batches;
CREATE POLICY "Org access for batches" ON public.batches FOR ALL USING (org_id = public.get_my_org_id());

DROP POLICY IF EXISTS "Org access for batch_members" ON public.batch_members;
CREATE POLICY "Org access for batch_members" ON public.batch_members FOR ALL USING (batch_id IN (SELECT id FROM public.batches WHERE org_id = public.get_my_org_id()));

-- 5. RPC for batch members management
CREATE OR REPLACE FUNCTION public.update_batch_members(p_batch_id UUID, p_athlete_ids UUID[])
RETURNS VOID AS $$
BEGIN
    DELETE FROM public.batch_members WHERE batch_id = p_batch_id;
    INSERT INTO public.batch_members (batch_id, athlete_id)
    SELECT p_batch_id, unnest(p_athlete_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

async function main() {
    console.log('Applying batch migration...');
    const result = await execSQL(BATCH_SQL);
    console.log(`Status: ${result.status}`);
    console.log(`Body: ${result.body}`);
}

main().catch(console.error);
