-- Enums
CREATE TYPE public.ams_role AS ENUM ('coach', 'athlete');

-- Profiles Alteration
ALTER TABLE public.profiles
ADD COLUMN full_name TEXT,
ADD COLUMN ams_role public.ams_role,
ADD COLUMN position TEXT,
ADD COLUMN max_hr INTEGER,
ADD COLUMN resting_hr INTEGER;

-- Wellness Logs
CREATE TABLE public.wellness_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    sleep_score INTEGER CHECK (sleep_score >= 1 AND sleep_score <= 10),
    stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 10),
    soreness_level INTEGER CHECK (soreness_level >= 1 AND soreness_level <= 10),
    fatigue_level INTEGER CHECK (fatigue_level >= 1 AND fatigue_level <= 10),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Training Sessions
CREATE TABLE public.training_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    sport_type TEXT NOT NULL,
    duration_mins INTEGER NOT NULL,
    rpe INTEGER CHECK (rpe >= 1 AND rpe <= 10),
    calculated_load INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- External Telemetry
CREATE TABLE public.external_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    source TEXT NOT NULL,
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    processed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_wellness_logs_athlete_id ON public.wellness_logs(athlete_id);
CREATE INDEX idx_training_sessions_athlete_id ON public.training_sessions(athlete_id);
CREATE INDEX idx_external_telemetry_athlete_id ON public.external_telemetry(athlete_id);

-- RLS
ALTER TABLE public.wellness_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_telemetry ENABLE ROW LEVEL SECURITY;

-- Policies
-- Wellness Logs: athletes can read/insert their own, coaches can read all
CREATE POLICY "Athletes can view their own wellness logs" ON public.wellness_logs FOR SELECT TO authenticated USING (athlete_id = auth.uid());
CREATE POLICY "Athletes can insert their own wellness logs" ON public.wellness_logs FOR INSERT TO authenticated WITH CHECK (athlete_id = auth.uid());
CREATE POLICY "Coaches can view all wellness logs" ON public.wellness_logs FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND ams_role = 'coach')
);

-- Training Sessions: athletes can read/insert their own, coaches can read all
CREATE POLICY "Athletes can view their own training sessions" ON public.training_sessions FOR SELECT TO authenticated USING (athlete_id = auth.uid());
CREATE POLICY "Athletes can insert their own training sessions" ON public.training_sessions FOR INSERT TO authenticated WITH CHECK (athlete_id = auth.uid());
CREATE POLICY "Coaches can view all training sessions" ON public.training_sessions FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND ams_role = 'coach')
);

-- External Telemetry: athletes can read/insert their own, coaches can read all
CREATE POLICY "Athletes can view their own external telemetry" ON public.external_telemetry FOR SELECT TO authenticated USING (athlete_id = auth.uid());
CREATE POLICY "Athletes can insert their own external telemetry" ON public.external_telemetry FOR INSERT TO authenticated WITH CHECK (athlete_id = auth.uid());
CREATE POLICY "Coaches can view all external telemetry" ON public.external_telemetry FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND ams_role = 'coach')
);
