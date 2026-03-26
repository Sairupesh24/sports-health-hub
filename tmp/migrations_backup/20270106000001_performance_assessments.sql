-- Performance Assessments Table
CREATE TABLE IF NOT EXISTS public.performance_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    category TEXT NOT NULL CHECK (category IN ('Jump', 'Sprint', 'Strength', 'Mobility', 'Conditioning')),
    test_name TEXT NOT NULL,
    metrics JSONB NOT NULL DEFAULT '{}'::JSONB,
    session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
    recorded_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_performance_athlete ON public.performance_assessments(athlete_id);
CREATE INDEX IF NOT EXISTS idx_performance_category ON public.performance_assessments(category);
CREATE INDEX IF NOT EXISTS idx_performance_recorded_at ON public.performance_assessments(recorded_at);

-- RLS Policies
ALTER TABLE public.performance_assessments ENABLE ROW LEVEL SECURITY;

-- 1. Athletes can read their own assessments
CREATE POLICY "Athletes can view own performance"
ON public.performance_assessments FOR SELECT
TO authenticated
USING (auth.uid() = athlete_id);

-- 2. Sports Scientists and Admins can do everything
CREATE POLICY "Staff can manage performance assessments"
ON public.performance_assessments FOR ALL
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'consultant') OR
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND ams_role IN ('sports_scientist', 'coach')
    )
);



-- Helper function to refresh PostgREST (usually triggered by DDL in some envs)
SELECT pg_notify('pgrst', 'reload schema');
