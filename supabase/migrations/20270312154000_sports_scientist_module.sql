-- Migration for Sports Scientist Operations Module

-- 1. Add roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sports_scientist';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';
COMMIT;

-- 2. Client Ownership Model
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS primary_scientist_id UUID REFERENCES public.profiles(id);

-- 3. Session Types
CREATE TABLE IF NOT EXISTS public.session_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT, -- e.g. Speed, Strength, Testing, Screening, Rehab, Group
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

-- 4. Unified Sessions Extensions
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS scientist_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS group_name TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS session_location TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS session_notes TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS session_type_id UUID REFERENCES public.session_types(id);

-- 5. Session Templates
CREATE TABLE IF NOT EXISTS public.session_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scientist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    template_name TEXT NOT NULL,
    session_type_id UUID REFERENCES public.session_types(id) ON DELETE SET NULL,
    default_duration INTERVAL DEFAULT '1 hour',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Group Attendance System
CREATE TABLE IF NOT EXISTS public.group_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    attendance_status TEXT NOT NULL DEFAULT 'Present' CHECK (attendance_status IN ('Present', 'Absent', 'Late')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, client_id)
);

-- 7. Session Facts (Analytics)
CREATE TABLE IF NOT EXISTS public.session_facts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
    scientist_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    session_type_id UUID REFERENCES public.session_types(id) ON DELETE SET NULL,
    session_mode TEXT,
    session_duration INTERVAL,
    session_status TEXT,
    session_date DATE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_sessions_scientist ON public.sessions(scientist_id);
CREATE INDEX IF NOT EXISTS idx_sessions_type ON public.sessions(session_type_id);
CREATE INDEX IF NOT EXISTS idx_group_attendance_session ON public.group_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_group_attendance_client ON public.group_attendance(client_id);
CREATE INDEX IF NOT EXISTS idx_session_facts_date ON public.session_facts(session_date);
CREATE INDEX IF NOT EXISTS idx_session_facts_org ON public.session_facts(organization_id);

-- 9. RLS Policies for Sports Scientist
ALTER TABLE public.session_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_facts ENABLE ROW LEVEL SECURITY;

-- Session Types Policies (using get_my_org_id if it exists, otherwise use profile subquery)
-- Assuming public.get_my_org_id() is a standard helper in this project
DO $$ 
BEGIN
    CREATE POLICY "Users can view org session types" ON public.session_types FOR SELECT USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
    CREATE POLICY "Admins and Scientists can manage session types" ON public.session_types FOR ALL USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) AND 
        (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sports_scientist'))
    );

    -- Session Templates Policies
    CREATE POLICY "Scientists can manage own templates" ON public.session_templates FOR ALL USING (scientist_id = auth.uid());
    CREATE POLICY "Users can view templates in their org" ON public.session_templates FOR SELECT USING (
        scientist_id IN (SELECT id FROM public.profiles WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
    );

    -- Group Attendance Policies
    CREATE POLICY "Users can view org group attendance" ON public.group_attendance FOR SELECT USING (
        session_id IN (SELECT id FROM public.sessions WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
    );
    CREATE POLICY "Scientists and Admins can manage attendance" ON public.group_attendance FOR ALL USING (
        session_id IN (SELECT id FROM public.sessions WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())) AND
        (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sports_scientist'))
    );

    -- Session Facts Policies
    CREATE POLICY "Users can view org session facts" ON public.session_facts FOR SELECT USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 10. Trigger for Session Facts Population
CREATE OR REPLACE FUNCTION public.populate_session_fact()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'Completed' AND (OLD.status IS NULL OR OLD.status != 'Completed') THEN
        INSERT INTO public.session_facts (
            session_id, scientist_id, client_id, session_type_id, 
            session_mode, session_duration, session_status, 
            session_date, organization_id, location_id
        )
        VALUES (
            NEW.id, NEW.scientist_id, NEW.client_id, NEW.session_type_id,
            NEW.session_mode, (NEW.actual_end - NEW.actual_start), NEW.status,
            NEW.scheduled_start::DATE, NEW.organization_id, NULL
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS after_session_complete ON public.sessions;
CREATE TRIGGER after_session_complete
AFTER UPDATE OF status ON public.sessions
FOR EACH ROW EXECUTE FUNCTION public.populate_session_fact();
