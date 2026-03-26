-- Comprehensive Exercise Library Seed Data
-- 200+ exercises categorized by equipment type, body region, and difficulty

DO $
BEGIN
    -- ============================================
    -- HEAVY GYM EXERCISES (~50 exercises)
    -- Requires: Machines, squat racks, cable stations, Smith machines, leg press
    -- ============================================
    
    INSERT INTO exercises (name, description, category, equipment_type, difficulty_level, muscle_groups, body_region, equipment_required, instructions, is_rehabilitation)
    VALUES
    -- STRENGTH - Lower Body (Heavy Gym)
    ('Leg Press', 'Machine-based compound leg exercise', 'strength', 'heavy_gym', 'beginner', ARRAY['quadriceps', 'hamstrings', 'glutes'], 'lower_extremity', 'Leg Press Machine', 'Position feet shoulder-width on platform. Lower weight with control, push through heels to return.', true),
    ('Hack Squat', 'Machine-based squat variation', 'strength', 'heavy_gym', 'intermediate', ARRAY['quadriceps', 'glutes', 'hamstrings'], 'lower_extremity', 'Hack Squat Machine', 'Position shoulders under pads, feet shoulder-width on platform. Lower with control, drive up through heels.', true),
    ('Romanian Deadlift (Machine)', 'Hip hinge movement on machine', 'strength', 'heavy_gym', 'intermediate', ARRAY['hamstrings', 'glutes', 'lower_back'], 'hip', 'Smith Machine or RDL Machine', 'Stand with bar at hip height, hinge at hips keeping back straight, feel hamstring stretch, return.', true),
    ('Leg Extension', 'Isolated quadriceps strengthening', 'strength', 'heavy_gym', 'beginner', ARRAY['quadriceps'], 'knee', 'Leg Extension Machine', 'Sit with back against pad, ankles behind roller. Extend legs fully, lower with control.', true),
    ('Leg Curl', 'Isolated hamstring strengthening', 'strength', 'heavy_gym', 'beginner', ARRAY['hamstrings'], 'knee', 'Leg Curl Machine', 'Lie face down with ankles under roller. Curl heels toward glutes, lower with control.', true),
    ('Calf Press (Machine)', 'Standing calf raise on machine', 'strength', 'heavy_gym', 'beginner', ARRAY['gastrocnemius', 'soleus'], 'ankle', 'Calf Press Machine', 'Position balls of feet on platform edge. Lower heels for stretch, press up onto toes.', true),
    ('Hip Abduction (Machine)', 'Standing hip abduction', 'strength', 'heavy_gym', 'beginner', ARRAY['gluteus_medius', 'gluteus_minimus'], 'hip', 'Hip Abduction Machine', 'Stand on platform, attach cable to outer ankle. Lift leg outward against resistance.', true),
    ('Hip Adduction (Machine)', 'Standing hip adduction', 'strength', 'heavy_gym', 'beginner', ARRAY['adductors', 'gracilis'], 'hip', 'Hip Adduction Machine', 'Stand with cable on inner ankle. Bring leg across body against resistance.', true),
    ('Glute Kickback (Machine)', 'Machine-based glute isolation', 'strength', 'heavy_gym', 'beginner', ARRAY['glutes', 'hamstrings'], 'hip', 'Glute Kickback Machine', 'Position chest against pad, knee on support. Kick leg backward squeezing glutes.', true),
    ('Smith Machine Squat', 'Barbell squat in guided track', 'strength', 'heavy_gym', 'intermediate', ARRAY['quadriceps', 'glutes', 'hamstrings'], 'lower_extremity', 'Smith Machine', 'Position bar on upper back, feet shoulder-width. Lower until thighs parallel, drive up.', true),
    ('Smith Machine Romanian Deadlift', 'Hip hinge on Smith machine', 'strength', 'heavy_gym', 'intermediate', ARRAY['hamstrings', 'glutes', 'lower_back'], 'hip', 'Smith Machine', 'Bar at hip level, hinge at hips keeping bar close to legs, feel hamstring stretch.', true),
    ('Smith Machine Calf Raise', 'Standing calf raise on Smith', 'strength', 'heavy_gym', 'beginner', ARRAY['gastrocnemius', 'soleus'], 'ankle', 'Smith Machine', 'Bar on back, balls of feet on plate. Rise onto toes, lower for calf stretch.', true),
    
    -- STRENGTH - Upper Body Push (Heavy Gym)
    ('Chest Press Machine', 'Seated chest pressing movement', 'strength', 'heavy_gym', 'beginner', ARRAY['pectoralis_major', 'anterior_deltoid', 'triceps'], 'upper_extremity', 'Chest Press Machine', 'Grip handles, push forward bringing hands together, control the return.', true),
    ('Smith Machine Bench Press', 'Barbell bench press in guided track', 'strength', 'heavy_gym', 'intermediate', ARRAY['pectoralis_major', 'anterior_deltoid', 'triceps'], 'upper_extremity', 'Smith Machine', 'Unrack bar, lower to chest, press up keeping wrists straight.', true),
    ('Incline Chest Press Machine', 'Incline pressing for upper chest', 'strength', 'heavy_gym', 'intermediate', ARRAY['upper_pectoralis', 'anterior_deltoid', 'triceps'], 'upper_extremity', 'Incline Chest Press Machine', 'Set bench to 30-45 degrees. Press handles forward, lower with control.', true),
    ('Decline Chest Press Machine', 'Decline pressing for lower chest', 'strength', 'heavy_gym', 'intermediate', ARRAY['lower_pectoralis', 'triceps', 'anterior_deltoid'], 'upper_extremity', 'Decline Chest Press Machine', 'Set bench to decline position. Press handles forward, lower with control.', true),
    ('Machine Shoulder Press', 'Seated overhead pressing', 'strength', 'heavy_gym', 'beginner', ARRAY['anterior_deltoid', 'lateral_deltoid', 'triceps'], 'shoulder', 'Shoulder Press Machine', 'Grip handles at shoulder height, press overhead, lower with control.', true),
    ('Pec Deck (Chest Fly)', 'Machine chest fly movement', 'strength', 'heavy_gym', 'beginner', ARRAY['pectoralis_major', 'anterior_deltoid'], 'upper_extremity', 'Pec Deck Machine', 'Position back against pad, grip handles. Bring arms together in hugging motion.', true),
    ('Machine Dips', 'Assisted dips on machine', 'strength', 'heavy_gym', 'beginner', ARRAY['pectoralis', 'triceps', 'anterior_deltoid'], 'upper_extremity', 'Dips Machine', 'Grip handles, lower body by bending elbows, press up.', true),
    ('Tricep Pushdown (Cable)', 'Cable tricep extension', 'strength', 'heavy_gym', 'beginner', ARRAY['triceps'], 'upper_extremity', 'Cable Machine with rope or bar', 'Pull cable down keeping elbows at sides, fully extend arms, control return.', true),
    ('Overhead Tricep Extension (Cable)', 'Cable overhead tricep extension', 'strength', 'heavy_gym', 'intermediate', ARRAY['triceps'], 'upper_extremity', 'Cable Machine with rope', 'Hold rope behind head, pull down extending arms, feel tricep stretch.', true),
    ('Bicep Curl (Cable)', 'Cable bicep curl', 'strength', 'heavy_gym', 'beginner', ARRAY['biceps', 'brachialis'], 'upper_extremity', 'Cable Machine with straight bar', 'Stand facing cable, curl bar up keeping elbows stationary, lower with control.', true),
    
    -- STRENGTH - Upper Body Pull (Heavy Gym)
    ('Lat Pulldown', 'Cable lat pulldown', 'strength', 'heavy_gym', 'beginner', ARRAY['latissimus_dorsi', 'rhomboids', 'biceps'], 'upper_extremity', 'Lat Pulldown Machine', 'Grip bar wide, pull down to upper chest, squeeze lats, control return.', true),
    ('Close Grip Lat Pulldown', 'Narrow grip lat pulldown', 'strength', 'heavy_gym', 'intermediate', ARRAY['latissimus_dorsi', 'biceps', 'rhomboids'], 'upper_extremity', 'Lat Pulldown Machine', 'Use close grip handle, pull down to chest focusing on lats.', true),
    ('Seated Cable Row', 'Cable row for back thickness', 'strength', 'heavy_gym', 'beginner', ARRAY['rhomboids', 'middle_trapezius', 'biceps'], 'upper_extremity', 'Cable Row Machine', 'Sit upright, pull handle to lower chest, squeeze shoulder blades together.', true),
    ('Wide Grip Cable Row', 'Wide grip cable row', 'strength', 'heavy_gym', 'intermediate', ARRAY['rhomboids', 'rear_deltoid', 'middle_trapezius'], 'upper_extremity', 'Cable Row Machine', 'Use wide grip attachment, pull to chest keeping back straight.', true),
    ('Face Pull', 'Cable face pull for rear delts', 'strength', 'heavy_gym', 'beginner', ARRAY['rear_deltoid', 'rhomboids', 'external_rotators'], 'shoulder', 'Cable Machine with rope', 'Pull rope to face level keeping elbows high, squeeze rear delts.', true),
    ('Straight Arm Pulldown', 'Cable straight arm lat exercise', 'strength', 'heavy_gym', 'intermediate', ARRAY['latissimus_dorsi'], 'upper_extremity', 'Cable Machine with bar', 'Keep arms straight, pull bar down to thighs using lats.', true),
    ('Cable Lateral Raise', 'Cable lateral raise', 'strength', 'heavy_gym', 'beginner', ARRAY['lateral_deltoid'], 'shoulder', 'Cable Machine', 'Stand sideways to cable, raise arm to shoulder height, lower with control.', true),
    ('Machine Reverse Fly', 'Rear deltoid machine fly', 'strength', 'heavy_gym', 'beginner', ARRAY['rear_deltoid', 'rhomboids'], 'shoulder', 'Reverse Fly Machine', 'Sit facing pad, pull handles backward squeezing rear delts.', true),
    ('T-Bar Row (Machine)', 'Machine T-bar row', 'strength', 'heavy_gym', 'intermediate', ARRAY['latissimus_dorsi', 'rhomboids', 'biceps'], 'upper_extremity', 'T-Bar Row Machine', 'Position chest against pad, pull handle to chest squeezing back.', true),
    ('Single Arm Cable Row', 'Unilateral cable row', 'strength', 'heavy_gym', 'intermediate', ARRAY['latissimus_dorsi', 'rhomboids', 'biceps'], 'upper_extremity', 'Cable Row Machine', 'Row with one arm at a time, keep core stable.', true),
    
    -- MOBILITY - Heavy Gym
    ('Hip Flexor Stretch (Machine Assisted)', 'Assisted hip flexor stretch', 'mobility', 'heavy_gym', 'beginner', ARRAY['iliopsoas', 'rectus_femoris'], 'hip', ' Assisted Stretching Machine', 'Position on machine for assisted hip flexor stretch.', false),
    ('Hamstring Stretch (Machine Assisted)', 'Assisted hamstring stretch', 'mobility', 'heavy_gym', 'beginner', ARRAY['hamstrings'], 'knee', 'Assisted Stretching Machine', 'Use machine to gently stretch hamstrings.', false),
    ('Quad Stretch (Machine Assisted)', 'Assisted quadriceps stretch', 'mobility', 'heavy_gym', 'beginner', ARRAY['quadriceps'], 'knee', 'Assisted Stretching Machine', 'Use machine to assist quad stretching.', false),
    
    -- BALANCE - Heavy Gym
    ('Single Leg Press', 'Single leg press on machine', 'balance', 'heavy_gym', 'intermediate', ARRAY['quadriceps', 'glutes', 'core'], 'lower_extremity', 'Leg Press Machine', 'Perform leg press with one leg at a time.', true),
    ('Single Leg Hack Squat', 'Single leg hack squat', 'balance', 'heavy_gym', 'advanced', ARRAY['quadriceps', 'glutes'], 'lower_extremity', 'Hack Squat Machine', 'Perform hack squat with one leg at a time.', true),

    -- ============================================
    -- AVERAGE GYM EXERCISES (~50 exercises)
    -- Requires: Dumbbells, barbells, kettlebells, resistance bands, cable machines
    -- ============================================
    
    -- STRENGTH - Lower Body (Average Gym)
    ('Barbell Back Squat', 'Classic barbell back squat', 'strength', 'average_gym', 'intermediate', ARRAY['quadriceps', 'glutes', 'hamstrings', 'core'], 'lower_extremity', 'Barbell, Squat Rack', 'Bar on upper back, feet shoulder-width. Squat until thighs parallel, drive up through heels.', true),
    ('Barbell Front Squat', 'Front loaded squat', 'strength', 'average_gym', 'advanced', ARRAY['quadriceps', 'glutes', 'core'], 'lower_extremity', 'Barbell, Squat Rack', 'Bar on front of shoulders, elbows high. Squat keeping torso upright.', true),
    ('Barbell Romanian Deadlift', 'Hip hinge with barbell', 'strength', 'average_gym', 'intermediate', ARRAY['hamstrings', 'glutes', 'lower_back'], 'hip', 'Barbell', 'Bar at hip level, hinge at hips keeping back straight, feel hamstring stretch.', true),
    ('Dumbbell Walking Lunge', 'Walking lunge with dumbbells', 'strength', 'average_gym', 'intermediate', ARRAY['quadriceps', 'glutes', 'hamstrings'], 'lower_extremity', 'Dumbbells', 'Hold dumbbells at sides, step forward into lunge, alternate legs.', true),
    ('Dumbbell Bulgarian Split Squat', 'Rear foot elevated split squat', 'strength', 'average_gym', 'intermediate', ARRAY['quadriceps', 'glutes'], 'lower_extremity', 'Dumbbells, Bench', 'Rear foot on bench, front foot forward. Lower into split squat.', true),
    ('Dumbbell Step Up', 'Step up onto elevated surface', 'strength', 'average_gym', 'beginner', ARRAY['quadriceps', 'glutes'], 'lower_extremity', 'Dumbbells, Step or Bench', 'Step up onto bench holding dumbbells, drive through front heel.', true),
    ('Dumbbell Goblet Squat', 'Goblet squat with dumbbell', 'strength', 'average_gym', 'beginner', ARRAY['quadriceps', 'glutes', 'core'], 'lower_extremity', 'Dumbbell', 'Hold dumbbell at chest, squat between legs keeping chest up.', true),
    ('Dumbbell Deadlift', 'Dumbbell deadlift', 'strength', 'average_gym', 'beginner', ARRAY['hamstrings', 'glutes', 'lower_back'], 'hip', 'Dumbbells', 'Hinge at hips with dumbbells in front, keep back straight.', true),
    ('Kettlebell Swing', 'Hip hinge kettlebell swing', 'strength', 'average_gym', 'intermediate', ARRAY['hamstrings', 'glutes', 'core'], 'hip', 'Kettlebell', 'Hinge at hips, swing kettlebell to shoulder height using hip drive.', true),
    ('Kettlebell Goblet Squat', 'Kettlebell goblet squat', 'strength', 'average_gym', 'beginner', ARRAY['quadriceps', 'glutes', 'core'], 'lower_extremity', 'Kettlebell', 'Hold kettlebell at chest, squat deeply keeping chest up.', true),
    ('Kettlebell Romanian Deadlift', 'Hip hinge with kettlebell', 'strength', 'average_gym', 'intermediate', ARRAY['hamstrings', 'glutes', 'lower_back'], 'hip', 'Kettlebell', 'Hold kettlebell in front, hinge at hips, feel hamstring stretch.', true),
    ('Single Leg Romanian Deadlift (Dumbbell)', 'Single leg RDL with dumbbell', 'balance', 'average_gym', 'advanced', ARRAY['hamstrings', 'glutes', 'core'], 'hip', 'Dumbbell', 'Stand on one leg, hinge forward with dumbbell, keep back straight.', true),
    ('Dumbbell Lateral Lunge', 'Side lunge with dumbbells', 'strength', 'average_gym', 'intermediate', ARRAY['quadriceps', 'glutes', 'adductors'], 'lower_extremity', 'Dumbbells', 'Step laterally into lunge, keep other leg straight.', true),
    ('Dumbbell Sumo Squat', 'Wide stance squat', 'strength', 'average_gym', 'beginner', ARRAY['quadriceps', 'glutes', 'adductors'], 'lower_extremity', 'Dumbbells', 'Wide stance, toes out, hold dumbbells between legs, squat down.', true),
    ('Dumbbell Calf Raise', 'Standing calf raise', 'strength', 'average_gym', 'beginner', ARRAY['gastrocnemius', 'soleus'], 'ankle', 'Dumbbells', 'Stand holding dumbbells, rise onto toes, lower for calf stretch.', true),
    ('Single Leg Calf Raise', 'Single leg calf raise', 'balance', 'average_gym', 'intermediate', ARRAY['gastrocnemius', 'soleus'], 'ankle', 'None or wall for balance', 'Stand on one leg, rise onto toes, lower with control.', true),
    ('Barbell Hip Thrust', 'Hip thrust with barbell', 'strength', 'average_gym', 'intermediate', ARRAY['glutes', 'hamstrings'], 'hip', 'Barbell, Bench', 'Upper back on bench, bar over hips, thrust hips up squeezing glutes.', true),
    ('Barbell Glute Bridge', 'Glute bridge with barbell', 'strength', 'average_gym', 'beginner', ARRAY['glutes', 'hamstrings'], 'hip', 'Barbell', 'Lie on floor with bar over hips, bridge up squeezing glutes.', true),
    ('Kettlebell Pistol Squat', 'Single leg squat with kettlebell', 'strength', 'average_gym', 'advanced', ARRAY['quadriceps', 'glutes', 'core'], 'lower_extremity', 'Kettlebell', 'Hold kettlebell at chest, squat on one leg with other leg extended.', true),
    ('Dumbbell Reverse Lunge', 'Reverse lunge with dumbbells', 'strength', 'average_gym', 'beginner', ARRAY['quadriceps', 'glutes', 'hamstrings'], 'lower_extremity', 'Dumbbells', 'Step backward into lunge, alternate legs.', true),
    
    -- STRENGTH - Upper Body Push (Average Gym)
    ('Barbell Bench Press', 'Classic barbell bench press', 'strength', 'average_gym', 'intermediate', ARRAY['pectoralis_major', 'anterior_deltoid', 'triceps'], 'upper_extremity', 'Barbell, Bench', 'Lie on bench, lower bar to chest, press up keeping wrists straight.', true),
    ('Incline Barbell Bench Press', 'Incline barbell bench press', 'strength', 'average_gym', 'intermediate', ARRAY['upper_pectoralis', 'anterior_deltoid', 'triceps'], 'upper_extremity', 'Barbell, Incline Bench', 'Set bench to 30-45 degrees, press bar from upper chest.', true),
    ('Dumbbell Bench Press', 'Dumbbell chest press', 'strength', 'average_gym', 'beginner', ARRAY['pectoralis_major', 'anterior_deltoid', 'triceps'], 'upper_extremity', 'Dumbbells, Bench', 'Lie on bench, lower dumbbells to chest, press up.', true),
    ('Dumbbell Incline Press', 'Incline dumbbell press', 'strength', 'average_gym', 'beginner', ARRAY['upper_pectoralis', 'anterior_deltoid', 'triceps'], 'upper_extremity', 'Dumbbells, Incline Bench', 'Set bench to 30-45 degrees, press dumbbells from upper chest.', true),
    ('Dumbbell Shoulder Press', 'Overhead press with dumbbells', 'strength', 'average_gym', 'beginner', ARRAY['anterior_deltoid', 'lateral_deltoid', 'triceps'], 'shoulder', 'Dumbbells', 'Press dumbbells overhead from shoulder height, lower with control.', true),
    ('Arnold Press', 'Rotating dumbbell shoulder press', 'strength', 'average_gym', 'intermediate', ARRAY['anterior_deltoid', 'lateral_deltoid', 'posterior_deltoid', 'triceps'], 'shoulder', 'Dumbbells', 'Start with palms facing you, rotate as you press overhead.', true),
    ('Dumbbell Lateral Raise', 'Side raise for lateral delts', 'strength', 'average_gym', 'beginner', ARRAY['lateral_deltoid'], 'shoulder', 'Dumbbells', 'Raise dumbbells to sides until parallel to floor, lower with control.', true),
    ('Dumbbell Front Raise', 'Front raise for anterior delts', 'strength', 'average_gym', 'beginner', ARRAY['anterior_deltoid'], 'shoulder', 'Dumbbells', 'Raise dumbbells in front to shoulder height, lower with control.', true),
    ('Dumbbell Fly', 'Chest fly with dumbbells', 'strength', 'average_gym', 'beginner', ARRAY['pectoralis_major', 'anterior_deltoid'], 'upper_extremity', 'Dumbbells, Bench', 'Lie on bench, open arms wide, bring together above chest.', true),
    ('Incline Dumbbell Fly', 'Incline chest fly', 'strength', 'average_gym', 'beginner', ARRAY['upper_pectoralis', 'anterior_deltoid'], 'upper_extremity', 'Dumbbells, Incline Bench', 'Set bench to 30 degrees, perform chest fly movement.', true),
    ('Dumbbell Tricep Extension', 'Overhead tricep extension', 'strength', 'average_gym', 'beginner', ARRAY['triceps'], 'upper_extremity', 'Dumbbell', 'Hold dumbbell overhead with both hands, lower behind head, extend.', true),
    ('Dumbbell Tricep Kickback', 'Tricep kickback', 'strength', 'average_gym', 'beginner', ARRAY['triceps'], 'upper_extremity', 'Dumbbell, Bench', 'Bend over bench, extend forearm backward, squeeze tricep.', true),
    ('Dumbbell Bicep Curl', 'Standing bicep curl', 'strength', 'average_gym', 'beginner', ARRAY['biceps', 'brachialis'], 'upper_extremity', 'Dumbbells', 'Curl dumbbells up keeping elbows stationary, lower with control.', true),
    ('Hammer Curl', 'Neutral grip bicep curl', 'strength', 'average_gym', 'beginner', ARRAY['biceps', 'brachialis'], 'upper_extremity', 'Dumbbells', 'Curl with palms facing each other, works brachialis.', true),
    ('Concentration Curl', 'Seated concentration curl', 'strength', 'average_gym', 'beginner', ARRAY['biceps'], 'upper_extremity', 'Dumbbell, Bench', 'Sit, elbow on inner thigh, curl dumbbell focusing on bicep.', true),
    
    -- STRENGTH - Upper Body Pull (Average Gym)
    ('Barbell Row', 'Bent over barbell row', 'strength', 'average_gym', 'intermediate', ARRAY['latissimus_dorsi', 'rhomboids', 'biceps', 'erector_spinae'], 'upper_extremity', 'Barbell', 'Bend over, pull bar to lower chest squeezing back muscles.', true),
    ('Dumbbell Row', 'Single arm dumbbell row', 'strength', 'average_gym', 'beginner', ARRAY['latissimus_dorsi', 'rhomboids', 'biceps'], 'upper_extremity', 'Dumbbell, Bench', 'Support with one hand on bench, row dumbbell to hip.', true),
    ('Pull-up (Weighted)', 'Weighted pull-up', 'strength', 'average_gym', 'advanced', ARRAY['latissimus_dorsi', 'biceps', 'rhomboids'], 'upper_extremity', 'Pull-up Bar, Weight vest or dumbbell', 'Hang from bar, pull up until chin over bar.', true),
    ('Chin-up (Weighted)', 'Weighted chin-up', 'strength', 'average_gym', 'advanced', ARRAY['biceps', 'latissimus_dorsi'], 'upper_extremity', 'Pull-up Bar, Weight vest or dumbbell', 'Underhand grip, pull up until chin over bar.', true),
    ('Kettlebell Row', 'Single arm kettlebell row', 'strength', 'average_gym', 'intermediate', ARRAY['latissimus_dorsi', 'rhomboids', 'biceps'], 'upper_extremity', 'Kettlebell', 'Hinge forward, row kettlebell to hip squeezing back.', true),
    ('Farmer Carry', 'Loaded carry for grip and core', 'strength', 'average_gym', 'intermediate', ARRAY['grip', 'core', 'trapézius'], 'core', 'Dumbbells or Kettlebells', 'Walk holding heavy weights at sides, maintain upright posture.', true),
    ('Waiter Carry', 'Single arm overhead carry', 'balance', 'average_gym', 'advanced', ARRAY['core', 'lateral_deltoid', 'grip'], 'core', 'Kettlebell or Dumbbell', 'Hold weight overhead while walking, keep core stable.', true),
    
    -- MOBILITY - Average Gym
    ('90/90 Hip Stretch', 'Internal and external hip rotation stretch', 'mobility', 'average_gym', 'beginner', ARRAY['hip_flexors', 'external_rotators', 'internal_rotators'], 'hip', 'None', 'Sit with front leg at 90 degrees, back leg at 90 degrees, rotate between positions.', true),
    ('Dumbbell Pec Stretch', 'Door frame pec stretch with dumbbell', 'mobility', 'average_gym', 'beginner', ARRAY['pectoralis_major', 'anterior_deltoid'], 'shoulder', 'Dumbbell, Door frame', 'Arm on door frame at 90 degrees, lean through for pec stretch.', true),
    ('Kettlebell Arm Bar', 'Mobility drill for shoulder and thoracic', 'mobility', 'average_gym', 'intermediate', ARRAY['latissimus_dorsi', 'thoracic_spine', 'shoulder'], 'shoulder', 'Kettlebell', 'From kneeling, press kettlebell overhead, rotate and reach.', true),
    ('Goblet Squat Hold', 'Deep squat hold for mobility', 'mobility', 'average_gym', 'beginner', ARRAY['ankles', 'hips', 'thoracic_spine'], 'hip', 'Kettlebell or Dumbbell', 'Hold goblet squat position, relax into stretch.', true),
    
    -- PLYOMETRIC - Average Gym
    ('Kettlebell Swing', 'Powerful hip hinge for power', 'plyometric', 'average_gym', 'intermediate', ARRAY['hamstrings', 'glutes', 'core'], 'hip', 'Kettlebell', 'Explosive hip drive, swing kettlebell to chest or overhead.', true),
    ('Dumbbell Jump Squat', 'Jump squat with dumbbells', 'plyometric', 'average_gym', 'advanced', ARRAY['quadriceps', 'glutes', 'core'], 'lower_extremity', 'Light Dumbbells', 'Hold dumbbells, squat and jump explosively.', true),
    
    -- ============================================
    -- MINIMAL EQUIPMENT EXERCISES (~50 exercises)
    -- Requires: Resistance bands, light weights, door frame, chair, wall
    -- ============================================
    
    -- STRENGTH - Lower Body (Minimal)
    ('Bodyweight Squat', 'Basic bodyweight squat', 'strength', 'minimal_equipment', 'beginner', ARRAY['quadriceps', 'glutes', 'hamstrings'], 'lower_extremity', 'None', 'Feet shoulder-width, squat down keeping chest up, stand up.', true),
    ('Bodyweight Lunge', 'Basic forward lunge', 'strength', 'minimal_equipment', 'beginner', ARRAY['quadriceps', 'glutes', 'hamstrings'], 'lower_extremity', 'None', 'Step forward into lunge, lower back knee toward floor.', true),
    ('Bodyweight Step Up', 'Step up without weights', 'strength', 'minimal_equipment', 'beginner', ARRAY['quadriceps', 'glutes'], 'lower_extremity', 'Step or Stair', 'Step up onto elevated surface, drive through front heel.', true),
    ('Wall Sit', 'Isometric wall squat', 'strength', 'minimal_equipment', 'beginner', ARRAY['quadriceps', 'glutes'], 'lower_extremity', 'Wall', 'Lean against wall, slide down into squat position, hold.', true),
    ('Chair Squat', 'Squat to chair', 'strength', 'minimal_equipment', 'beginner', ARRAY['quadriceps', 'glutes'], 'lower_extremity', 'Chair', 'Squat down to touch chair, stand back up.', true),
    ('Single Leg Stand', 'Single leg balance and strength', 'balance', 'minimal_equipment', 'beginner', ARRAY['ankle_stabilizers', 'glutes', 'core'], 'ankle', 'None or wall for support', 'Stand on one leg maintaining balance.', true),
    ('Resistance Band Squat', 'Squat with band resistance', 'strength', 'minimal_equipment', 'beginner', ARRAY['quadriceps', 'glutes'], 'lower_extremity', 'Resistance Band', 'Stand on band, hold handles at shoulders, perform squat.', true),
    ('Resistance Band Leg Extension', 'Band leg extension', 'strength', 'minimal_equipment', 'beginner', ARRAY['quadriceps'], 'knee', 'Resistance Band', 'Anchor band behind, sit, extend leg against resistance.', true),
    ('Resistance Band Leg Curl', 'Band leg curl', 'strength', 'minimal_equipment', 'beginner', ARRAY['hamstrings'], 'knee', 'Resistance Band', 'Anchor band in front, lie face down, curl leg against resistance.', true),
    ('Resistance Band Hip Abduction', 'Band hip abduction', 'strength', 'minimal_equipment', 'beginner', ARRAY['gluteus_medius'], 'hip', 'Resistance Band', 'Anchor band to stable object, stand, lift leg outward.', true),
    ('Resistance Band Hip Adduction', 'Band hip adduction', 'strength', 'minimal_equipment', 'beginner', ARRAY['adductors'], 'hip', 'Resistance Band', 'Anchor band to side, bring leg across body against resistance.', true),
    ('Resistance Band Glute Bridge', 'Glute bridge with band', 'strength', 'minimal_equipment', 'beginner', ARRAY['glutes', 'hamstrings'], 'hip', 'Resistance Band', 'Place band around thighs, perform glute bridge.', true),
    ('Clamshell', 'Hip external rotation exercise', 'strength', 'minimal_equipment', 'beginner', ARRAY['gluteus_medius', 'external_rotators'], 'hip', 'Resistance Band', 'Lie on side, knees bent, open top knee against band.', true),
    ('Side Lying Leg Raise', 'Hip abduction in side position', 'strength', 'minimal_equipment', 'beginner', ARRAY['gluteus_medius', 'gluteus_minimus'], 'hip', 'None', 'Lie on side, lift top leg upward keeping knee straight.', true),
    ('Bridging', 'Basic glute bridge', 'strength', 'minimal_equipment', 'beginner', ARRAY['glutes', 'hamstrings'], 'hip', 'None', 'Lie on back, knees bent, lift hips squeezing glutes.', true),
    ('Single Leg Bridge', 'Unilateral glute bridge', 'balance', 'minimal_equipment', 'intermediate', ARRAY['glutes', 'hamstrings', 'core'], 'hip', 'None', 'Perform bridge on one leg at a time.', true),
    ('Calf Raise (Wall Support)', 'Calf raise using wall', 'strength', 'minimal_equipment', 'beginner', ARRAY['gastrocnemius', 'soleus'], 'ankle', 'Wall', 'Hold wall for balance, rise onto toes, lower with control.', true),
    ('Toe Raises', 'Tibialis anterior strengthening', 'strength', 'minimal_equipment', 'beginner', ARRAY['tibialis_anterior'], 'ankle', 'None', 'While standing, pull toes toward shin against resistance.', true),
    ('Ankle Circles', 'Ankle mobility exercise', 'mobility', 'minimal_equipment', 'beginner', ARRAY['ankle_stabilizers'], 'ankle', 'None', 'Rotate foot in circles, both directions.', true),
    ('Resistance Band Ankle Dorsiflexion', 'Ankle rehab exercise', 'strength', 'minimal_equipment', 'beginner', ARRAY['tibialis_anterior'], 'ankle', 'Resistance Band', 'Anchor band to stable object, pull foot up against resistance.', true),
    
    -- STRENGTH - Upper Body (Minimal)
    ('Wall Push-up', 'Push-up against wall', 'strength', 'minimal_equipment', 'beginner', ARRAY['pectoralis_major', 'anterior_deltoid', 'triceps'], 'upper_extremity', 'Wall', 'Stand facing wall, perform push-up motion.', true),
    ('Incline Push-up', 'Push-up on elevated surface', 'strength', 'minimal_equipment', 'beginner', ARRAY['pectoralis_major', 'anterior_deltoid', 'triceps'], 'upper_extremity', 'Table or Counter', 'Hands on elevated surface, perform push-up.', true),
    ('Knee Push-up', 'Modified push-up on knees', 'strength', 'minimal_equipment', 'beginner', ARRAY['pectoralis_major', 'anterior_deltoid', 'triceps'], 'upper_extremity', 'None', 'From knees, lower chest toward floor, push back up.', true),
    ('Full Push-up', 'Standard push-up', 'strength', 'minimal_equipment', 'intermediate', ARRAY['pectoralis_major', 'anterior_deltoid', 'triceps', 'core'], 'upper_extremity', 'None', 'Plank position, lower chest to floor, push back up.', true),
    ('Diamond Push-up', 'Close grip push-up', 'strength', 'minimal_equipment', 'intermediate', ARRAY['triceps', 'pectoralis_major'], 'upper_extremity', 'None', 'Hands together forming diamond, perform push-up.', true),
    ('Wide Push-up', 'Wide hand placement push-up', 'strength', 'minimal_equipment', 'intermediate', ARRAY['pectoralis_major', 'anterior_deltoid'], 'upper_extremity', 'None', 'Hands wider than shoulder width, perform push-up.', true),
    ('Decline Push-up', 'Feet elevated push-up', 'strength', 'minimal_equipment', 'intermediate', ARRAY['upper_pectoralis', 'anterior_deltoid', 'triceps'], 'upper_extremity', 'Chair or Bench', 'Feet on elevated surface, hands on floor, perform push-up.', true),
    ('Pike Push-up', 'Shoulder-focused push-up', 'strength', 'minimal_equipment', 'intermediate', ARRAY['anterior_deltoid', 'lateral_deltoid', 'triceps'], 'shoulder', 'None', 'Hips piked up, lower head toward floor between hands.', true),
    ('Resistance Band Row', 'Seated band row', 'strength', 'minimal_equipment', 'beginner', ARRAY['latissimus_dorsi', 'rhomboids', 'biceps'], 'upper_extremity', 'Resistance Band', 'Anchor band, sit upright, pull band to chest.', true),
    ('Resistance Band Pull Apart', 'Shoulder blade squeeze with band', 'strength', 'minimal_equipment', 'beginner', ARRAY['rear_deltoid', 'rhomboids', 'middle_trapezius'], 'shoulder', 'Resistance Band', 'Hold band in front, pull apart squeezing shoulder blades.', true),
    ('Resistance Band Face Pull', 'Band face pull', 'strength', 'minimal_equipment', 'beginner', ARRAY['rear_deltoid', 'rhomboids'], 'shoulder', 'Resistance Band', 'Anchor band at face height, pull toward face keeping elbows high.', true),
    ('Resistance Band Shoulder Press', 'Band overhead press', 'strength', 'minimal_equipment', 'beginner', ARRAY['anterior_deltoid', 'lateral_deltoid', 'triceps'], 'shoulder', 'Resistance Band', 'Stand on band, press overhead, lower with control.', true),
    ('Resistance Band Lateral Raise', 'Band lateral raise', 'strength', 'minimal_equipment', 'beginner', ARRAY['lateral_deltoid'], 'shoulder', 'Resistance Band', 'Stand on band, raise arms to sides.', true),
    ('Door Frame Row', 'Inverted row using door frame', 'strength', 'minimal_equipment', 'beginner', ARRAY['latissimus_dorsi', 'rhomboids', 'biceps'], 'upper_extremity', 'Door Frame', 'Grip door frame, lean back, pull chest toward door.', true),
    ('Door Frame Bicep Curl', 'Bicep curl using door frame', 'strength', 'minimal_equipment', 'beginner', ARRAY['biceps'], 'upper_extremity', 'Door Frame', 'Grip door frame, curl against resistance.', true),
    ('Scapular Push-up', 'Shoulder blade protraction exercise', 'strength', 'minimal_equipment', 'beginner', ARRAY['serratus_anterior'], 'shoulder', 'None', 'Plank position, push shoulder blades apart, return.', true),
    ('Prone Y Raise', 'Prone Y raise for lower traps', 'strength', 'minimal_equipment', 'beginner', ARRAY['lower_trapezius', 'rear_deltoid'], 'shoulder', 'None', 'Lie face down, raise arms in Y shape.', true),
    ('Prone T Raise', 'Prone T raise for middle traps', 'strength', 'minimal_equipment', 'beginner', ARRAY['middle_trapezius', 'rear_deltoid'], 'shoulder', 'None', 'Lie face down, raise arms in T shape.', true),
    ('Prone I Raise', 'Prone I raise for lower traps', 'strength', 'minimal_equipment', 'beginner', ARRAY['lower_trapezius'], 'shoulder', 'None', 'Lie face down, raise arms in I shape overhead.', true),
    
    -- MOBILITY - Minimal
    ('Door Frame Pec Stretch', 'Chest stretch using door frame', 'mobility', 'minimal_equipment', 'beginner', ARRAY['pectoralis_major', 'anterior_deltoid'], 'shoulder', 'Door Frame', 'Arm at 90 degrees on door frame, lean through for stretch.', true),
    ('Wall Chest Stretch', 'Corner chest stretch', 'mobility', 'minimal_equipment', 'beginner', ARRAY['pectoralis_major'], 'shoulder', 'Wall', 'Stand in corner, arms on walls, lean forward.', true),
    ('Cat-Cow Stretch', 'Thoracic spine mobility', 'mobility', 'minimal_equipment', 'beginner', ARRAY['thoracic_spine', 'erector_spinae'], 'spine', 'None', 'On hands and knees, alternate arching and rounding spine.', true),
    ('Childs Pose', 'Lower back and hip stretch', 'mobility', 'minimal_equipment', 'beginner', ARRAY['lower_back', 'glutes'], 'spine', 'None', 'Kneel, sit back on heels, stretch arms forward on floor.', true),
    ('Knee to Chest Stretch', 'Lower back and hip stretch', 'mobility', 'minimal_equipment', 'beginner', ARRAY['glutes', 'lower_back', 'hamstrings'], 'hip', 'None', 'Lie on back, bring one knee to chest.', true),
    ('Figure 4 Stretch', 'Piriformis and glute stretch', 'mobility', 'minimal_equipment', 'beginner', ARRAY['piriformis', 'glutes'], 'hip', 'None', 'Lie on back, cross ankle over opposite knee, pull thigh.', true),
    ('Hip Flexor Stretch', 'Kneeling hip flexor stretch', 'mobility', 'minimal_equipment', 'beginner', ARRAY['iliopsoas', 'rectus_femoris'], 'hip', 'None', 'Kneel on one knee, push hips forward.', true),
    ('Hamstring Stretch (Standing)', 'Standing hamstring stretch', 'mobility', 'minimal_equipment', 'beginner', ARRAY['hamstrings'], 'knee', 'None', 'Stand, extend leg forward on elevated surface, lean forward.', true),
    ('Quad Stretch (Standing)', 'Standing quadriceps stretch', 'mobility', 'minimal_equipment', 'beginner', ARRAY['quadriceps'], 'knee', 'Wall for balance', 'Stand, pull foot toward glutes keeping knees together.', true),
    ('Calf Stretch (Wall)', 'Wall calf stretch', 'mobility', 'minimal_equipment', 'beginner', ARRAY['gastrocnemius', 'soleus'], 'ankle', 'Wall', 'Face wall, step one foot back, press heel down.', true),
    ('Ankle Dorsiflexion Stretch', 'Ankle mobility stretch', 'mobility', 'minimal_equipment', 'beginner', ARRAY['gastrocnemius', 'ankle_joint'], 'ankle', 'Wall', 'Face wall, knee past toes, press knee over ankle.', true),
    ('Wrist Flexor Stretch', 'Wrist stretching', 'mobility', 'minimal_equipment', 'beginner', ARRAY['wrist_flexors'], 'upper_extremity', 'None', 'Extend arm, pull fingers back with other hand.', true),
    ('Wrist Extensor Stretch', 'Wrist stretching', 'mobility', 'minimal_equipment', 'beginner', ARRAY['wrist_extensors'], 'upper_extremity', 'None', 'Extend arm, pull fingers down with other hand.', true),
    ('Neck Rotation', 'Cervical mobility', 'mobility', 'minimal_equipment', 'beginner', ARRAY['cervical_spine'], 'spine', 'None', 'Slowly rotate head side to side.', true),
    ('Chin Tucks', 'Cervical spine correction', 'mobility', 'minimal_equipment', 'beginner', ARRAY['cervical_spine', 'deep_neck_flexors'], 'spine', 'None', 'Pull chin straight back creating double chin.', true),
    ('Thoracic Extension (Foam Roller)', 'Thoracic spine extension', 'mobility', 'minimal_equipment', 'intermediate', ARRAY['thoracic_spine'], 'spine', 'Foam Roller', 'Lie over foam roller, extend spine over roller.', true),
    ('Thread the Needle', 'Thoracic rotation stretch', 'mobility', 'minimal_equipment', 'beginner', ARRAY['thoracic_spine', 'rotators'], 'spine', 'None', 'On all fours, rotate arm under body reaching for opposite side.', true),
    
    -- BALANCE - Minimal
    ('Single Leg Balance', 'Balance on one leg', 'balance', 'minimal_equipment', 'beginner', ARRAY['ankle_stabilizers', 'core', 'glutes'], 'ankle', 'None for support if needed', 'Stand on one leg maintaining balance.', true),
    ('Tandem Balance', 'Heel-to-toe balance', 'balance', 'minimal_equipment', 'beginner', ARRAY['ankle_stabilizers', 'core'], 'ankle', 'None or wall for support', 'Stand heel to toe in a line.', true),
    ('Single Leg Reach', 'Balance with reach', 'balance', 'minimal_equipment', 'intermediate', ARRAY['ankle_stabilizers', 'core', 'hip'], 'hip', 'None', 'Stand on one leg, reach forward with other leg.', true),
    
    -- ============================================
    -- CALISTHENICS EXERCISES (~50 exercises)
    -- Requires: Bodyweight only - floor, pull-up bar, parallel bars
    -- ============================================
    
    -- STRENGTH - Upper Body (Calisthenics)
    ('Pull-up', 'Classic pull-up', 'strength', 'calisthenics', 'intermediate', ARRAY['latissimus_dorsi', 'biceps', 'rhomboids'], 'upper_extremity', 'Pull-up Bar', 'Hang from bar, pull up until chin over bar.', true),
    ('Chin-up', 'Underhand pull-up', 'strength', 'calisthenics', 'intermediate', ARRAY['biceps', 'latissimus_dorsi'], 'upper_extremity', 'Pull-up Bar', 'Underhand grip, pull up until chin over bar.', true),
    ('Wide Grip Pull-up', 'Wide grip lat exercise', 'strength', 'calisthenics', 'intermediate', ARRAY['latissimus_dorsi', 'rhomboids'], 'upper_extremity', 'Pull-up Bar', 'Wide grip, pull up focusing on lats.', true),
    ('Close Grip Pull-up', 'Narrow grip pull-up', 'strength', 'calisthenics', 'intermediate', ARRAY['latissimus_dorsi', 'biceps', 'rhomboids'], 'upper_extremity', 'Pull-up Bar', 'Close grip, pull up to chest.', true),
    ('Commando Pull-up', 'Alternate side pull-up', 'strength', 'calisthenics', 'advanced', ARRAY['latissimus_dorsi', 'biceps', 'core'], 'upper_extremity', 'Pull-up Bar', 'Face bar sideways, pull up alternating sides.', true),
    ('Muscle-up', 'Pull-up transitioning to dip', 'strength', 'calisthenics', 'advanced', ARRAY['latissimus_dorsi', 'chest', 'triceps', 'core'], 'upper_extremity', 'Pull-up Bar', 'Pull up explosively, transition over bar into dip position.', true),
    ('Dips', 'Parallel bar dips', 'strength', 'calisthenics', 'intermediate', ARRAY['pectoralis_major', 'triceps', 'anterior_deltoid'], 'upper_extremity', 'Parallel Bars', 'Lower body by bending elbows, press back up.', true),
    ('Bench Dips', 'Tricep dips on bench', 'strength', 'calisthenics', 'beginner', ARRAY['triceps', 'pectoralis_minor'], 'upper_extremity', 'Bench or Chair', 'Hands on bench behind body, lower and press.', true),
    ('L-Sit (Parallel Bars)', 'Isometric L-sit hold', 'strength', 'calisthenics', 'advanced', ARRAY['hip_flexors', 'core', 'triceps'], 'core', 'Parallel Bars', 'Hold body up with legs extended horizontally.', true),
    ('V-Sit', 'Advanced L-sit variation', 'strength', 'calisthenics', 'advanced', ARRAY['hip_flexors', 'core', 'triceps'], 'core', 'Parallel Bars', 'Hold V-shaped position with legs and torso.', true),
    ('Hanging Leg Raise', 'Hanging core exercise', 'strength', 'calisthenics', 'intermediate', ARRAY['hip_flexors', 'core', 'grip'], 'core', 'Pull-up Bar', 'Hang from bar, raise legs to 90 degrees.', true),
    ('Hanging Knee Raise', 'Beginner hanging core', 'strength', 'calisthenics', 'beginner', ARRAY['hip_flexors', 'core', 'grip'], 'core', 'Pull-up Bar', 'Hang from bar, raise knees to chest.', true),
    ('Ab Wheel Rollout', 'Core rollout exercise', 'strength', 'calisthenics', 'intermediate', ARRAY['core', 'latissimus_dorsi'], 'core', 'Ab Wheel', 'Roll wheel forward extending body, roll back.', true),
    ('Plank', 'Isometric core hold', 'strength', 'calisthenics', 'beginner', ARRAY['core', 'shoulder_stabilizers'], 'core', 'None', 'Hold push-up position on forearms.', true),
    ('Side Plank', 'Lateral core hold', 'strength', 'calisthenics', 'beginner', ARRAY['obliques', 'core'], 'core', 'None', 'Lie on side, support on forearm, lift hips.', true),
    ('Mountain Climbers', 'Dynamic core and cardio', 'plyometric', 'calisthenics', 'beginner', ARRAY['core', 'hip_flexors', 'shoulder_stabilizers'], 'core', 'None', 'Plank position, drive knees toward chest alternately.', true),
    ('Dead Hang', 'Grip and shoulder endurance', 'strength', 'calisthenics', 'beginner', ARRAY['grip', 'shoulder_stabilizers'], 'upper_extremity', 'Pull-up Bar', 'Hang from bar with straight arms.', true),
    ('Active Hang', 'Shoulder engagement in hang', 'strength', 'calisthenics', 'intermediate', ARRAY['latissimus_dorsi', 'shoulder_stabilizers'], 'shoulder', 'Pull-up Bar', 'Hang with shoulders pulled down and back.', true),
    
    -- STRENGTH - Lower Body (Calisthenics)
    ('Pistol Squat', 'Single leg squat', 'strength', 'calisthenics', 'advanced', ARRAY['quadriceps', 'glutes', 'core', 'hip_flexors'], 'lower_extremity', 'None or wall for support', 'Squat on one leg with other leg extended forward.', true),
    ('Shrimp Squat', 'Rear leg elevated single leg squat', 'strength', 'calisthenics', 'advanced', ARRAY['quadriceps', 'glutes', 'core'], 'lower_extremity', 'None or wall for support', 'Hold rear foot behind, squat on front leg.', true),
    ('Bulgarian Split Squat (Bodyweight)', 'Rear foot elevated squat', 'strength', 'calisthenics', 'intermediate', ARRAY['quadriceps', 'glutes'], 'lower_extremity', 'Bench or Step', 'Rear foot on bench, squat on front leg.', true),
    ('Jump Squat', 'Explosive squat jump', 'plyometric', 'calisthenics', 'intermediate', ARRAY['quadriceps', 'glutes', 'core'], 'lower_extremity', 'None', 'Squat and jump explosively, land softly.', true),
    ('Broad Jump', 'Horizontal jump for distance', 'plyometric', 'calisthenics', 'intermediate', ARRAY['quadriceps', 'glutes', 'hamstrings'], 'lower_extremity', 'None', 'Jump forward as far as possible, land softly.', true),
    ('Single Leg Hop', 'Single leg explosive hop', 'plyometric', 'calisthenics', 'advanced', ARRAY['quadriceps', 'glutes', 'ankle_stabilizers'], 'lower_extremity', 'None', 'Hop on one leg focusing on stability.', true),
    ('Box Jump', 'Jump onto elevated surface', 'plyometric', 'calisthenics', 'intermediate', ARRAY['quadriceps', 'glutes', 'hamstrings'], 'lower_extremity', 'Box or Bench', 'Jump onto box landing softly, step down.', true),
    ('Skater Jump', 'Lateral plyometric jump', 'plyometric', 'calisthenics', 'intermediate', ARRAY['glutes', 'quadriceps', 'ankle_stabilizers'], 'lower_extremity', 'None', 'Jump laterally landing on one leg.', true),
    ('Tuck Jump', 'Jumping knee tuck', 'plyometric', 'calisthenics', 'advanced', ARRAY['quadriceps', 'hip_flexors', 'core'], 'lower_extremity', 'None', 'Jump and bring knees to chest in air.', true),
    ('Cossack Squat', 'Deep lateral squat', 'strength', 'calisthenics', 'intermediate', ARRAY['quadriceps', 'glutes', 'adductors'], 'hip', 'None', 'Wide stance, squat to one side keeping other leg straight.', true),
    ('Dragon Squat', 'Elevated rear leg squat', 'strength', 'calisthenics', 'advanced', ARRAY['quadriceps', 'glutes', 'hip_flexors'], 'lower_extremity', 'None', 'One leg elevated behind, squat on front leg.', true),
    ('Sissy Squat', 'Leaning quad squat', 'strength', 'calisthenics', 'advanced', ARRAY['quadriceps'], 'knee', 'None', 'Lean back while squatting, stress on quads.', true),
    ('Glute Bridge (Single Leg)', 'Unilateral glute bridge', 'strength', 'calisthenics', 'beginner', ARRAY['glutes', 'hamstrings'], 'hip', 'None', 'Bridge on one leg at a time.', true),
    ('Donkey Kick', 'Quadruped glute exercise', 'strength', 'calisthenics', 'beginner', ARRAY['glutes'], 'hip', 'None', 'On all fours, kick leg back and up squeezing glute.', true),
    ('Frog Kick', 'Prone glute exercise', 'strength', 'calisthenics', 'beginner', ARRAY['glutes', 'hamstrings'], 'hip', 'None', 'Lie face down, kick legs back in small pulses.', true),
    ('Superman', 'Prone back extension', 'strength', 'calisthenics', 'beginner', ARRAY['erector_spinae', 'glutes'], 'spine', 'None', 'Lie face down, lift arms and legs off floor.', true),
    ('Reverse Hyperextension', 'Lower back and glute exercise', 'strength', 'calisthenics', 'beginner', ARRAY['glutes', 'hamstrings', 'erector_spinae'], 'hip', 'Bench or Table', 'Lie face down on bench, lift legs behind.', true),
    
    -- MOBILITY - Calisthenics
    ('Splits (Front)', 'Front split stretch', 'mobility', 'calisthenics', 'advanced', ARRAY['hamstrings', 'hip_flexors', 'adductors'], 'hip', 'None or support', 'Progressively work toward front splits.', true),
    ('Splits (Side)', 'Side split stretch', 'mobility', 'calisthenics', 'advanced', ARRAY['adductors', 'hamstrings'], 'hip', 'None or support', 'Progressively work toward side splits.', true),
    ('Pike Stretch', 'Forward fold with straight legs', 'mobility', 'calisthenics', 'beginner', ARRAY['hamstrings', 'calves'], 'lower_extremity', 'None', 'Bend forward reaching for toes with straight legs.', true),
    ('Straddle Stretch', 'Wide leg forward fold', 'mobility', 'calisthenics', 'beginner', ARRAY['adductors', 'hamstrings'], 'hip', 'None', 'Sit with legs wide, fold forward.', true),
    ('Bridge Hold', 'Full bridge position', 'mobility', 'calisthenics', 'intermediate', ARRAY['hip_flexors', 'thoracic_spine', 'shoulder'], 'spine', 'None', 'Lie on back, press up into full bridge.', true),
    ('Wheel Pose', 'Full backbend', 'mobility', 'calisthenics', 'advanced', ARRAY['hip_flexors', 'thoracic_spine', 'shoulder'], 'spine', 'None', 'Full bridge with arms and legs straight.', true),
    ('Handstand Hold', 'Inverted balance', 'balance', 'calisthenics', 'advanced', ARRAY['shoulder_stabilizers', 'core', 'trapézius'], 'shoulder', 'Wall for support', 'Hold handstand position against wall or freestanding.', true),
    ('Crow Pose', 'Arm balance', 'balance', 'calisthenics', 'advanced', ARRAY['core', 'shoulder_stabilizers', 'wrist_flexors'], 'upper_extremity', 'None', 'Rest knees on upper arms in crouching handstand.', true),
    ('Forearm Stand', 'Inverted balance on forearms', 'balance', 'calisthenics', 'advanced', ARRAY['core', 'shoulder_stabilizers', 'trapézius'], 'shoulder', 'Wall for support', 'Hold handstand on forearms.', true),
    ('L-Sit (Floor)', 'Floor L-sit hold', 'strength', 'calisthenics', 'intermediate', ARRAY['hip_flexors', 'core', 'triceps'], 'core', 'None', 'Support body on hands with legs extended forward.', true),
    
    -- CORE - Calisthenics
    ('Hanging Toe to Bar', 'Advanced hanging core', 'strength', 'calisthenics', 'advanced', ARRAY['hip_flexors', 'core', 'grip'], 'core', 'Pull-up Bar', 'Hang from bar, raise straight legs to bar.', true),
    ('Dragon Flag', 'Bruce Lee core exercise', 'strength', 'calisthenics', 'advanced', ARRAY['core', 'hip_flexors'], 'core', 'Bench or Floor', 'Lie on bench, raise entire body keeping only shoulders down.', true),
    ('Human Flag', 'Horizontal body hold', 'strength', 'calisthenics', 'advanced', ARRAY['core', 'obliques', 'latissimus_dorsi', 'shoulder_stabilizers'], 'core', 'Pull-up Bar or Flag Pole', 'Hold body horizontally from vertical support.', true),
    ('Planche Lean', 'Forward leaning plank', 'strength', 'calisthenics', 'intermediate', ARRAY['anterior_deltoid', 'core', 'chest'], 'shoulder', 'None', 'In plank position, lean forward shifting weight over hands.', true),
    ('Pseudo Planche Push-up', 'Advanced push-up variation', 'strength', 'calisthenics', 'advanced', ARRAY['anterior_deltoid', 'core', 'chest'], 'upper_extremity', 'None', 'Push-up with hands positioned by waist, lean forward.', true),
    ('V-up', 'Full core crunch', 'strength', 'calisthenics', 'intermediate', ARRAY['hip_flexors', 'core'], 'core', 'None', 'Lie flat, simultaneously raise legs and torso touching toes.', true),
    ('Bicycle Crunch', 'Rotational core exercise', 'strength', 'calisthenics', 'beginner', ARRAY['obliques', 'core'], 'core', 'None', 'Alternate elbow to opposite knee in cycling motion.', true),
    ('Leg Raise Hold', 'Static leg raise position', 'strength', 'calisthenics', 'intermediate', ARRAY['hip_flexors', 'core'], 'core', 'None', 'Lie on back, raise legs to 90 degrees, hold.', true),
    ('Hollow Body Hold', 'Gymnastic core position', 'strength', 'calisthenics', 'intermediate', ARRAY['core', 'hip_flexors'], 'core', 'None', 'Lie on back, raise legs and shoulders with arms by ears.', true),
    ('Rocky Push-up', 'Rocking push-up for core', 'strength', 'calisthenics', 'intermediate', ARRAY['core', 'pectoralis', 'triceps'], 'core', 'None', 'Push-up with rocking motion between toes and hands.', true)
    
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Exercise library seeded successfully!';
END $$;
