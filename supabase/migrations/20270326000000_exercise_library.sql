-- Exercise Library Schema Migration
-- Creates the exercises table with comprehensive categorization

-- Create enum types for consistent data
DO $$ BEGIN
    CREATE TYPE exercise_category AS ENUM (
        'strength', 
        'mobility', 
        'balance', 
        'plyometric', 
        'flexibility'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE equipment_type AS ENUM (
        'heavy_gym',
        'average_gym', 
        'minimal_equipment',
        'calisthenics'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE difficulty_level AS ENUM (
        'beginner',
        'intermediate',
        'advanced'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE body_region AS ENUM (
        'shoulder',
        'knee',
        'ankle',
        'hip',
        'spine',
        'upper_extremity',
        'lower_extremity',
        'core',
        'full_body'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create exercises table
CREATE TABLE IF NOT EXISTS exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category exercise_category NOT NULL,
    equipment_type equipment_type NOT NULL,
    difficulty_level difficulty_level NOT NULL,
    muscle_groups TEXT[] NOT NULL,
    body_region body_region NOT NULL,
    equipment_required TEXT,
    instructions TEXT,
    video_url TEXT,
    is_rehabilitation BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_exercises_equipment_type ON exercises(equipment_type);
CREATE INDEX IF NOT EXISTS idx_exercises_body_region ON exercises(body_region);
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);
CREATE INDEX IF NOT EXISTS idx_exercises_difficulty ON exercises(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_exercises_muscle_groups ON exercises USING GIN(muscle_groups);
CREATE INDEX IF NOT EXISTS idx_exercises_rehabilitation ON exercises(is_rehabilitation) WHERE is_rehabilitation = true;

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_exercises_body_equipment ON exercises(body_region, equipment_type);
CREATE INDEX IF NOT EXISTS idx_exercises_body_rehab ON exercises(body_region, is_rehabilitation) WHERE is_rehabilitation = true;

-- Enable RLS
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to read exercises
DROP POLICY IF EXISTS "Allow authenticated users to read exercises" ON exercises;
CREATE POLICY "Allow authenticated users to read exercises"
    ON exercises FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Allow admins and consultants to insert/update/delete
DROP POLICY IF EXISTS "Allow admins to modify exercises" ON exercises;
CREATE POLICY "Allow admins to modify exercises"
    ON exercises FOR ALL
    TO authenticated
    USING (
        public.has_role(auth.uid(), 'super_admin') 
        OR public.has_role(auth.uid(), 'admin') 
        OR public.has_role(auth.uid(), 'consultant')
    );

-- Add comments for documentation
COMMENT ON TABLE exercises IS 'Comprehensive exercise library for rehabilitation and fitness';
COMMENT ON COLUMN exercises.equipment_type IS 'Equipment required: heavy_gym, average_gym, minimal_equipment, calisthenics';
COMMENT ON COLUMN exercises.body_region IS 'Primary body region: shoulder, knee, ankle, hip, spine, upper_extremity, lower_extremity, core, full_body';
COMMENT ON COLUMN exercises.muscle_groups IS 'Array of target muscle groups';
COMMENT ON COLUMN exercises.is_rehabilitation IS 'Mark as true for exercises suitable for rehabilitation programs';
