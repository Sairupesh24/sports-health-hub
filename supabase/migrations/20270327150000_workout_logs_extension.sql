-- Workout Logs and Sets Extension
-- Links Gym workouts to Training Sessions

-- Create workout_logs table
CREATE TABLE IF NOT EXISTS public.workout_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id) -- One workout log per training session
);

-- Create workout_sets table
CREATE TABLE IF NOT EXISTS public.workout_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_log_id UUID NOT NULL REFERENCES public.workout_logs(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES public.exercises(id),
    set_number INTEGER NOT NULL,
    weight_kg DECIMAL(10,2),
    reps INTEGER,
    rpe_per_set INTEGER CHECK (rpe_per_set >= 1 AND rpe_per_set <= 10),
    equipment_used TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;

-- Policies for workout_logs
CREATE POLICY "Athletes can view their own workout logs" ON public.workout_logs
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.training_sessions WHERE id = workout_logs.session_id AND athlete_id = auth.uid()));

CREATE POLICY "Athletes can insert their own workout logs" ON public.workout_logs
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.training_sessions WHERE id = session_id AND athlete_id = auth.uid()));

CREATE POLICY "Coaches can view all workout logs" ON public.workout_logs
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND ams_role = 'coach'));

-- Policies for workout_sets
CREATE POLICY "Athletes can view their own workout sets" ON public.workout_sets
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.workout_logs wl
        JOIN public.training_sessions ts ON wl.session_id = ts.id
        WHERE wl.id = workout_sets.workout_log_id AND ts.athlete_id = auth.uid()
    ));

CREATE POLICY "Athletes can insert their own workout sets" ON public.workout_sets
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.workout_logs wl
        JOIN public.training_sessions ts ON wl.session_id = ts.id
        WHERE wl.id = workout_log_id AND ts.athlete_id = auth.uid()
    ));

CREATE POLICY "Coaches can view all workout sets" ON public.workout_sets
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND ams_role = 'coach'));

-- Indexes for performance
CREATE INDEX idx_workout_logs_session_id ON public.workout_logs(session_id);
CREATE INDEX idx_workout_sets_workout_log_id ON public.workout_sets(workout_log_id);
CREATE INDEX idx_workout_sets_exercise_id ON public.workout_sets(exercise_id);
