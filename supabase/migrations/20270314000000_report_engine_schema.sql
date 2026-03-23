-- Migration for Integrated Sports Health & Physio Operating System (ISHPO) Reporting Engine

-- 1. Favorite Reports Table
CREATE TABLE IF NOT EXISTS public.report_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    module_id TEXT NOT NULL, -- e.g. 'registration', 'billing'
    template_id TEXT NOT NULL, -- e.g. 'client_list', 'revenue_summary'
    report_name TEXT NOT NULL,
    filters_json JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Reports Run History Table
CREATE TABLE IF NOT EXISTS public.reports_run_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    module_id TEXT NOT NULL,
    template_id TEXT NOT NULL,
    filters_json JSONB DEFAULT '{}',
    export_type TEXT CHECK (export_type IN ('VIEW', 'CSV', 'EXCEL', 'PDF')),
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS (Row Level Security)
ALTER TABLE public.report_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports_run_history ENABLE ROW LEVEL SECURITY;

-- 4. Policies for report_favorites
DO $$ 
BEGIN
    CREATE POLICY "Users can manage own favorites" ON public.report_favorites 
    FOR ALL USING (user_id = auth.uid());
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 5. Policies for reports_run_history
DO $$ 
BEGIN
    CREATE POLICY "Users can view own history" ON public.reports_run_history 
    FOR SELECT USING (user_id = auth.uid());
    
    CREATE POLICY "Users can insert own history" ON public.reports_run_history 
    FOR INSERT WITH CHECK (user_id = auth.uid());
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 6. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_report_favorites_user ON public.report_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_run_history_user ON public.reports_run_history(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_run_history_generated ON public.reports_run_history(generated_at);
