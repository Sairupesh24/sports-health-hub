-- AMS v2 Schema Migration
-- Implements the Athlete Management System Training Module

-- 1. Exercise Categories
CREATE TABLE IF NOT EXISTS public.exercise_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(org_id, name)
);

-- Seed initial categories (Global)
INSERT INTO public.exercise_categories (name) VALUES 
('Balance'), ('Core-Anti Rotation'), ('Core-Anti Flexion'), ('Core-Carries'), 
('Core-Rotation'), ('Core: Anti-Extension'), ('Glute Activation'), 
('Horizontal Pull Bilateral'), ('Horizontal Push Bilateral'), 
('Horizontal Push Unilateral'), ('Iso'), ('Isolation-Bicep'), 
('Isometric'), ('Jumps'), ('Lower Body Hinge Bilateral'), 
('Lower Body Push Bilateral'), ('Lower Body Push Unilateral')
ON CONFLICT (org_id, name) DO NOTHING;

-- 2. Refactor Exercises
-- Add new columns first
ALTER TABLE public.exercises 
ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.exercise_categories(id),
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS is_bodyweight BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT true;

-- Update category_id based on name matching
UPDATE public.exercises e
SET category_id = ec.id
FROM public.exercise_categories ec
WHERE ec.name ILIKE e.category::text AND e.category_id IS NULL;

-- 3. Questionnaires & Warmups
CREATE TABLE IF NOT EXISTS public.questionnaires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.saved_warmups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    video_url TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Training Programs
CREATE TABLE IF NOT EXISTS public.training_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES public.profiles(id),
    name TEXT NOT NULL,
    description TEXT,
    sport_tags TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Program Assignments
CREATE TABLE IF NOT EXISTS public.program_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
    athlete_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES public.profiles(id),
    start_date DATE NOT NULL,
    end_date DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Workout Days
CREATE TABLE IF NOT EXISTS public.workout_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    program_id UUID REFERENCES public.training_programs(id) ON DELETE CASCADE, -- Nullable for Ad-hoc
    scheduled_date DATE, -- Nullable for templates
    title TEXT DEFAULT 'Untitled Workout',
    notes TEXT,
    is_rest_day BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Workout Items
CREATE TABLE IF NOT EXISTS public.workout_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workout_day_id UUID NOT NULL REFERENCES public.workout_days(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('lift', 'saqc', 'circuit', 'sport_science', 'warmup', 'note')),
    display_order INTEGER DEFAULT 0,
    is_recurring BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Detail Tables
CREATE TABLE IF NOT EXISTS public.lift_items (
    id UUID PRIMARY KEY REFERENCES public.workout_items(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES public.exercises(id),
    sets INTEGER DEFAULT 1,
    reps TEXT,
    reps_type TEXT DEFAULT 'reps',
    load_value NUMERIC,
    load_type TEXT DEFAULT 'absolute',
    perc_off BOOLEAN DEFAULT false,
    tempo TEXT,
    rest_time_secs INTEGER,
    workout_grouping TEXT,
    each_side BOOLEAN DEFAULT false,
    body_weight BOOLEAN DEFAULT false,
    completion_lift BOOLEAN DEFAULT false,
    coach_completion BOOLEAN DEFAULT false,
    disable_max_tracking BOOLEAN DEFAULT false,
    force_max_update BOOLEAN DEFAULT false,
    bar_speed BOOLEAN DEFAULT false,
    peak_power BOOLEAN DEFAULT false,
    track_rep_count BOOLEAN DEFAULT true,
    track_volume_load BOOLEAN DEFAULT true,
    additional_info TEXT,
    tag_ids UUID[] DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS public.saqc_items (
    id UUID PRIMARY KEY REFERENCES public.workout_items(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES public.exercises(id),
    sets INTEGER DEFAULT 1,
    primary_input_type TEXT,
    enable_reps BOOLEAN DEFAULT false,
    enable_rest_per_rep BOOLEAN DEFAULT false,
    enable_intensity BOOLEAN DEFAULT false,
    rest_time_secs INTEGER,
    workout_grouping TEXT,
    pacing_type TEXT,
    additional_info TEXT
);

CREATE TABLE IF NOT EXISTS public.circuit_items (
    id UUID PRIMARY KEY REFERENCES public.workout_items(id) ON DELETE CASCADE,
    circuit_name TEXT,
    rounds INTEGER DEFAULT 1,
    user_input_type TEXT,
    amrap_time_limit INTERVAL,
    rest_time_secs INTEGER,
    workout_grouping TEXT,
    description TEXT,
    additional_info TEXT,
    coach_completion BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.sport_science_items (
    id UUID PRIMARY KEY REFERENCES public.workout_items(id) ON DELETE CASCADE,
    questionnaire_id UUID REFERENCES public.questionnaires(id),
    additional_info TEXT,
    require_response BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.warmup_items (
    id UUID PRIMARY KEY REFERENCES public.workout_items(id) ON DELETE CASCADE,
    warmup_id UUID REFERENCES public.saved_warmups(id),
    warmup_name TEXT,
    description TEXT,
    video_url TEXT,
    document_id UUID
);

CREATE TABLE IF NOT EXISTS public.note_items (
    id UUID PRIMARY KEY REFERENCES public.workout_items(id) ON DELETE CASCADE,
    content TEXT
);

-- 9. Logging Tables
CREATE TABLE IF NOT EXISTS public.athlete_workout_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workout_day_id UUID NOT NULL REFERENCES public.workout_days(id) ON DELETE CASCADE,
    athlete_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ DEFAULT now(),
    completion_status TEXT DEFAULT 'not_started' CHECK (completion_status IN ('not_started', 'in_progress', 'completed', 'skipped')),
    overall_notes TEXT,
    UNIQUE(workout_day_id, athlete_id)
);

CREATE TABLE IF NOT EXISTS public.athlete_item_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workout_item_id UUID NOT NULL REFERENCES public.workout_items(id) ON DELETE CASCADE,
    athlete_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    logged_at TIMESTAMPTZ DEFAULT now(),
    sets_completed JSONB DEFAULT '[]'::jsonb,
    rpe INTEGER,
    notes TEXT,
    skipped BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.athlete_saqc_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workout_item_id UUID NOT NULL REFERENCES public.workout_items(id) ON DELETE CASCADE,
    athlete_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    logged_at TIMESTAMPTZ DEFAULT now(),
    sets_data JSONB,
    time_recorded INTERVAL,
    distance_recorded NUMERIC,
    intensity TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS public.athlete_circuit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workout_item_id UUID NOT NULL REFERENCES public.workout_items(id) ON DELETE CASCADE,
    athlete_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    logged_at TIMESTAMPTZ DEFAULT now(),
    rounds_completed INTEGER,
    sets_per_round JSONB,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS public.athlete_science_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    sport_science_item_id UUID NOT NULL REFERENCES public.workout_items(id) ON DELETE CASCADE,
    athlete_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    responded_at TIMESTAMPTZ DEFAULT now(),
    answers JSONB
);

-- 10. PR Tracking
CREATE TABLE IF NOT EXISTS public.max_pr_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    athlete_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
    record_type TEXT NOT NULL CHECK (record_type IN ('1rm', 'max_reps')),
    value NUMERIC NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT now(),
    source_log_id UUID REFERENCES public.athlete_item_logs(id) ON DELETE CASCADE,
    is_current BOOLEAN DEFAULT true
);

-- 11. Security & RLS

ALTER TABLE public.exercise_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaires     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_warmups     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_days       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lift_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saqc_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circuit_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sport_science_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warmup_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_workout_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_item_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_saqc_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_circuit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_science_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.max_pr_records      ENABLE ROW LEVEL SECURITY;

-- Shared RLS logic: Users see data in their organization
-- Staff (Admins, Consultants, Coaches, Sports Scientists) can manage
-- Athletes can view their own assignments and log their own data

-- Helper function for organization access
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS UUID AS $$
    SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

-- Generic Policies
DO $$ 
DECLARE
    t TEXT;
    all_tables TEXT[] := ARRAY[
        'exercise_categories', 'questionnaires', 'saved_warmups', 'training_programs',
        'program_assignments', 'workout_days', 'workout_items', 
        'athlete_workout_completions', 'athlete_item_logs',
        'athlete_saqc_logs', 'athlete_circuit_logs', 'athlete_science_responses',
        'max_pr_records'
    ];
BEGIN
    FOR t IN SELECT unnest(all_tables) LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Org access for %I" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "Org access for %I" ON public.%I FOR ALL USING (org_id = public.get_my_org_id())', t, t);
    END LOOP;
END $$;

-- 12. RPC Functions

-- RPC for Reordering
CREATE OR REPLACE FUNCTION public.reorder_workout_items(p_items JSONB)
RETURNS VOID AS $$
DECLARE
    v_item RECORD;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS (id UUID, display_order INTEGER) LOOP
        UPDATE public.workout_items SET display_order = v_item.display_order WHERE id = v_item.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PR Auto-Detection Trigger
CREATE OR REPLACE FUNCTION public.update_max_pr()
RETURNS TRIGGER AS $$
DECLARE
    v_set JSONB;
    v_max_load NUMERIC := 0;
    v_org_id UUID;
BEGIN
    -- Only for Lift logs
    IF (SELECT item_type FROM public.workout_items WHERE id = NEW.workout_item_id) != 'lift' THEN
        RETURN NEW;
    END IF;

    SELECT org_id INTO v_org_id FROM public.workout_items WHERE id = NEW.workout_item_id;

    -- Find max load in current log
    FOR v_set IN SELECT * FROM jsonb_array_elements(NEW.sets_completed) LOOP
        IF (v_set->>'load')::NUMERIC > v_max_load THEN
            v_max_load := (v_set->>'load')::NUMERIC;
        END IF;
    END LOOP;

    -- Update PR for the exercise
    IF v_max_load > 0 THEN
        UPDATE public.max_pr_records
        SET is_current = false
        WHERE athlete_id = NEW.athlete_id 
          AND exercise_id = (SELECT exercise_id FROM public.lift_items WHERE id = NEW.workout_item_id)
          AND is_current = true
          AND value < v_max_load;

        INSERT INTO public.max_pr_records (org_id, athlete_id, exercise_id, record_type, value, source_log_id, is_current)
        SELECT v_org_id, NEW.athlete_id, (SELECT exercise_id FROM public.lift_items WHERE id = NEW.workout_item_id), '1rm', v_max_load, NEW.id, true
        WHERE NOT EXISTS (
            SELECT 1 FROM public.max_pr_records 
            WHERE athlete_id = NEW.athlete_id 
              AND exercise_id = (SELECT exercise_id FROM public.lift_items WHERE id = NEW.workout_item_id)
              AND is_current = true
              AND value >= v_max_load
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER after_lift_log_insert
AFTER INSERT OR UPDATE ON public.athlete_item_logs
FOR EACH ROW EXECUTE FUNCTION public.update_max_pr();
