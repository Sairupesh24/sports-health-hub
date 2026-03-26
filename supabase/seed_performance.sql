-- Full Environment & Performance Seed with Constraint Relaxing
DO $$
DECLARE
    v_org_id UUID := '00000000-0000-0000-0000-000000000001';
    v_athlete_id UUID;
    v_scientist_id UUID;
    v_recorded_at TIMESTAMP;
    v_jump_val NUMERIC;
    v_sprint_val NUMERIC;
    v_strength_val NUMERIC;
    v_mobility_val NUMERIC;
    v_names TEXT[] := ARRAY['Alex', 'Jordan', 'Sam', 'Taylor', 'Casey'];
BEGIN
    -- 0. Relax profiles-auth constraint (Optional: ONLY for seeding)
    BEGIN
        ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
    EXCEPTION WHEN OTHERS THEN 
        RAISE NOTICE 'Constraint already dropped or permission denied.';
    END;

    -- 1. Ensure Organization exists
    INSERT INTO public.organizations (id, name, slug, status)
    VALUES (v_org_id, 'ISHPO Performance Lab', 'ishpo-lab', 'active')
    ON CONFLICT (id) DO NOTHING;

    -- 2. Ensure Location exists
    INSERT INTO public.locations (organization_id, name)
    SELECT v_org_id, 'High-Performance Center'
    WHERE NOT EXISTS (SELECT 1 FROM public.locations WHERE organization_id = v_org_id);

    -- 3. Create a Scientist Profile
    v_scientist_id := '11111111-1111-1111-1111-111111111111';
    INSERT INTO public.profiles (id, organization_id, first_name, last_name, ams_role)
    VALUES (v_scientist_id, v_org_id, 'Dr. Smith', 'Performance', 'sports_scientist')
    ON CONFLICT (id) DO NOTHING;

    -- 4. Create Athletes and their data
    FOR i IN 1..5 LOOP
        v_athlete_id := ('22222222-2222-2222-2222-22222222222' || i)::uuid;
        
        INSERT INTO public.profiles (id, organization_id, first_name, last_name, ams_role)
        VALUES (v_athlete_id, v_org_id, v_names[i], 'Athlete' || i, 'athlete')
        ON CONFLICT (id) DO NOTHING;

        -- Seed 6 months of data per athlete
        FOR j IN 0..5 LOOP
            v_recorded_at := NOW() - (j * INTERVAL '30 days');
            
            -- Jump (CMJ)
            v_jump_val := (random() * 30 + 35)::numeric(5,2);
            INSERT INTO performance_assessments (athlete_id, test_name, category, metrics, recorded_at, recorded_by)
            VALUES (v_athlete_id, 'CMJ', 'Jump', jsonb_build_object('value', v_jump_val, 'unit', 'cm'), v_recorded_at, v_scientist_id);

            -- Broad Jump
            v_jump_val := (random() * 80 + 200)::numeric(5,2);
            INSERT INTO performance_assessments (athlete_id, test_name, category, metrics, recorded_at, recorded_by)
            VALUES (v_athlete_id, 'Broad Jump', 'Jump', jsonb_build_object('value', v_jump_val, 'unit', 'cm'), v_recorded_at, v_scientist_id);

            -- 30m Sprint
            v_sprint_val := (random() * 0.8 + 4.0)::numeric(5,2);
            INSERT INTO performance_assessments (athlete_id, test_name, category, metrics, recorded_at, recorded_by)
            VALUES (v_athlete_id, '30m Sprint', 'Sprint', jsonb_build_object('value', v_sprint_val, 'unit', 'sec'), v_recorded_at, v_scientist_id);

            -- Back Squat
            v_strength_val := (random() * 100 + 80)::numeric(5,2);
            INSERT INTO performance_assessments (athlete_id, test_name, category, metrics, recorded_at, recorded_by)
            VALUES (v_athlete_id, 'Back Squat 1RM', 'Strength', jsonb_build_object('value', v_strength_val, 'unit', 'kg'), v_recorded_at, v_scientist_id);

            -- FMS
            v_mobility_val := (random() * 7 + 14)::numeric(5,2);
            INSERT INTO performance_assessments (athlete_id, test_name, category, metrics, recorded_at, recorded_by)
            VALUES (v_athlete_id, 'FMS Score', 'Mobility', jsonb_build_object('value', v_mobility_val, 'unit', 'score'), v_recorded_at, v_scientist_id);
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Full environment seed with constraint relaxation complete.';
END $$;
