-- AMS v2 Extended Exercise Seeding
-- Adds more comprehensive exercises to the global library

-- Ensure categories exist
INSERT INTO public.exercise_categories (name) VALUES 
('Mobility'), ('Strength'), ('Plyometric'), ('Flexibility'), ('Speed'), ('Agility'), ('Quickness'), ('Cardio')
ON CONFLICT (org_id, name) DO NOTHING;

-- Insert Global Exercises
WITH cat AS (SELECT id, name FROM public.exercise_categories WHERE org_id IS NULL)
INSERT INTO public.exercises (name, category_id, equipment_type, difficulty_level, muscle_groups, body_region, is_global)
SELECT 
    'Barbell Squat', (SELECT id FROM cat WHERE name = 'Strength'), 'heavy_gym', 'intermediate', ARRAY['quadriceps', 'glutes', 'hamstrings'], 'lower_extremity', true
UNION ALL
SELECT 
    'Deadlift', (SELECT id FROM cat WHERE name = 'Strength'), 'heavy_gym', 'intermediate', ARRAY['hamstrings', 'glutes', 'lower_back'], 'hip', true
UNION ALL
SELECT 
    'Bench Press', (SELECT id FROM cat WHERE name = 'Strength'), 'heavy_gym', 'beginner', ARRAY['pectoralis_major', 'triceps'], 'upper_extremity', true
UNION ALL
SELECT 
    'Box Jump', (SELECT id FROM cat WHERE name = 'Plyometric'), 'average_gym', 'intermediate', ARRAY['quadriceps', 'glutes'], 'lower_extremity', true
UNION ALL
SELECT 
    'Agility Ladder Shuffle', (SELECT id FROM cat WHERE name = 'Agility'), 'minimal_equipment', 'beginner', ARRAY['calves', 'core'], 'lower_extremity', true
ON CONFLICT DO NOTHING;
