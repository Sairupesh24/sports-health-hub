-- Forcefully add all clinical columns to the existing injuries table
ALTER TABLE public.injuries 
    ADD COLUMN IF NOT EXISTS region TEXT,
    ADD COLUMN IF NOT EXISTS injury_type TEXT,
    ADD COLUMN IF NOT EXISTS diagnosis TEXT,
    ADD COLUMN IF NOT EXISTS mechanism_of_injury TEXT,
    ADD COLUMN IF NOT EXISTS severity TEXT,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Acute' CHECK (status IN ('Acute', 'Rehab', 'RTP', 'Resolved', 'Chronic')),
    ADD COLUMN IF NOT EXISTS expected_return_date DATE,
    ADD COLUMN IF NOT EXISTS clinical_notes TEXT;
