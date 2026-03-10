-- Migration to create the core Clinical Tracking and Session tables

-- 1. Create injuries table
CREATE TABLE IF NOT EXISTS public.injuries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    injury_date DATE NOT NULL,
    region TEXT NOT NULL,
    injury_type TEXT NOT NULL,
    diagnosis TEXT NOT NULL,
    mechanism_of_injury TEXT,
    severity TEXT,
    status TEXT NOT NULL CHECK (status IN ('Acute', 'Rehab', 'RTP', 'Resolved', 'Chronic')),
    expected_return_date DATE,
    clinical_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create rehab_progress table
CREATE TABLE IF NOT EXISTS public.rehab_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    injury_id UUID NOT NULL REFERENCES public.injuries(id) ON DELETE CASCADE,
    milestone TEXT NOT NULL,
    status TEXT NOT NULL,
    notes TEXT,
    recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
    recorded_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create sessions table (unified)
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    therapist_id UUID REFERENCES public.profiles(id),
    service_type TEXT NOT NULL, -- Physiotherapy, Strength & Conditioning, etc
    entitlement_id UUID REFERENCES public.client_entitlements(id), -- Nullable initially
    scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
    scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_start TIMESTAMP WITH TIME ZONE,
    actual_end TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'Planned' CHECK (status IN ('Planned', 'Completed', 'Missed', 'Rescheduled', 'Cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create physio_session_details table (SOAP Notes)
CREATE TABLE IF NOT EXISTS public.physio_session_details (
    session_id UUID PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE,
    injury_id UUID REFERENCES public.injuries(id),
    pain_score INTEGER CHECK (pain_score >= 0 AND pain_score <= 10),
    modality_used TEXT[], -- Array to hold 'IFT', 'UST', 'TENS', 'NONE', etc.
    treatment_type TEXT,
    manual_therapy TEXT,
    exercise_given TEXT,
    range_of_motion TEXT,
    strength_progress TEXT,
    clinical_notes TEXT, -- The main 'Subjective/Objective' notes
    next_plan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create external_training_summary (AMS Integration)
CREATE TABLE IF NOT EXISTS public.external_training_summary (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    training_date DATE NOT NULL,
    workout_name TEXT,
    duration_minutes INTEGER,
    training_load INTEGER,
    readiness_score INTEGER CHECK (readiness_score >= 0 AND readiness_score <= 10),
    completion_status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS setup
ALTER TABLE public.injuries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rehab_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.physio_session_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_training_summary ENABLE ROW LEVEL SECURITY;

-- Standard Policies based on get_my_org_id()

-- Injuries
CREATE POLICY "Users can manage injuries in their org" ON public.injuries FOR ALL USING (
    organization_id = public.get_my_org_id()
);

-- Rehab Progress uses injury's organization
CREATE POLICY "Users can manage rehab progress in their org" ON public.rehab_progress FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.injuries
        WHERE injuries.id = rehab_progress.injury_id
        AND injuries.organization_id = public.get_my_org_id()
    )
);

-- Sessions
CREATE POLICY "Users can manage sessions in their org" ON public.sessions FOR ALL USING (
    organization_id = public.get_my_org_id()
);

-- Physio Session Details uses session's organization
CREATE POLICY "Users can manage physio details in their org" ON public.physio_session_details FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.sessions
        WHERE sessions.id = physio_session_details.session_id
        AND sessions.organization_id = public.get_my_org_id()
    )
);

-- External Training Summary
CREATE POLICY "Users can view external training in their org" ON public.external_training_summary FOR SELECT USING (
    organization_id = public.get_my_org_id()
);
-- Allow edge functions/service roles to insert external training
CREATE POLICY "System can insert external training" ON public.external_training_summary FOR INSERT WITH CHECK (
    true
);
