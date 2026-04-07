const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function getEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split('\n');
  const env = {};
  lines.forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim().replace(/^"(.*)"$/, '$1');
      env[key] = value;
    }
  });
  return env;
}

const exercisesMap = [
  // TRAP BAR
  {
    name: 'Trap Bar Deadlift',
    description: 'A hinge movement using a trap bar that reduces strain on the lower back while building total body strength.',
    category: 'strength',
    equipment_type: 'heavy_gym',
    difficulty_level: 'intermediate',
    muscle_groups: ['glutes', 'hamstrings', 'quads', 'back'],
    body_region: 'lower_extremity',
    equipment_required: 'Trap Bar',
    is_rehabilitation: false,
    is_active: true
  },
  {
    name: 'Trap Bar RDL',
    description: 'Romanian deadlift using a trap bar to focus heavily on the hamstrings and glutes.',
    category: 'strength',
    equipment_type: 'heavy_gym',
    difficulty_level: 'intermediate',
    muscle_groups: ['hamstrings', 'glutes', 'lower back'],
    body_region: 'lower_extremity',
    equipment_required: 'Trap Bar',
    is_rehabilitation: false,
    is_active: true
  },
  {
    name: 'Trap Bar Squat',
    description: 'Keeps weight aligned with center of gravity, effectively building quads and glutes with a trap bar.',
    category: 'strength',
    equipment_type: 'heavy_gym',
    difficulty_level: 'beginner',
    muscle_groups: ['quads', 'glutes', 'calves'],
    body_region: 'lower_extremity',
    equipment_required: 'Trap Bar',
    is_rehabilitation: false,
    is_active: true
  },
  {
    name: 'Trap Bar Farmer\'s Walk',
    description: 'A carry exercise providing a natural implement for building grip, core, and total-body strength.',
    category: 'strength',
    equipment_type: 'heavy_gym',
    difficulty_level: 'beginner',
    muscle_groups: ['core', 'grip', 'traps', 'legs'],
    body_region: 'full_body',
    equipment_required: 'Trap Bar',
    is_rehabilitation: false,
    is_active: true
  },
  {
    name: 'Trap Bar Floor Press',
    description: 'A neutral-grip horizontal press that is often safer for shoulders.',
    category: 'strength',
    equipment_type: 'heavy_gym',
    difficulty_level: 'intermediate',
    muscle_groups: ['chest', 'triceps', 'shoulders'],
    body_region: 'upper_extremity',
    equipment_required: 'Trap Bar',
    is_rehabilitation: false,
    is_active: true
  },
  {
    name: 'Trap Bar Shrugs',
    description: 'Classic movement for building upper traps and neck.',
    category: 'strength',
    equipment_type: 'heavy_gym',
    difficulty_level: 'beginner',
    muscle_groups: ['traps', 'neck'],
    body_region: 'upper_extremity',
    equipment_required: 'Trap Bar',
    is_rehabilitation: false,
    is_active: true
  },
  {
    name: 'Trap Bar Bent-Over Row',
    description: 'Neutral grip row using elevated handles to allow deep range of motion.',
    category: 'strength',
    equipment_type: 'heavy_gym',
    difficulty_level: 'intermediate',
    muscle_groups: ['lats', 'rhomboids', 'biceps'],
    body_region: 'upper_extremity',
    equipment_required: 'Trap Bar',
    is_rehabilitation: false,
    is_active: true
  },

  // LANDMINE
  {
    name: 'Landmine Squat',
    description: 'A goblet-style squat using the landmine attachment, excellent for maintaining an upright torso.',
    category: 'strength',
    equipment_type: 'heavy_gym',
    difficulty_level: 'beginner',
    muscle_groups: ['quads', 'glutes', 'core'],
    body_region: 'lower_extremity',
    equipment_required: 'Landmine',
    is_rehabilitation: false,
    is_active: true
  },
  {
    name: 'Landmine RDL',
    description: 'A hip hinge utilizing the landmine\'s fixed arc to target the posterior chain.',
    category: 'strength',
    equipment_type: 'heavy_gym',
    difficulty_level: 'intermediate',
    muscle_groups: ['hamstrings', 'glutes', 'lower back'],
    body_region: 'lower_extremity',
    equipment_required: 'Landmine',
    is_rehabilitation: false,
    is_active: true
  },
  {
    name: 'Landmine Press',
    description: 'Standing or kneeling angled one-arm overhead press.',
    category: 'strength',
    equipment_type: 'heavy_gym',
    difficulty_level: 'beginner',
    muscle_groups: ['shoulders', 'triceps', 'upper chest'],
    body_region: 'upper_extremity',
    equipment_required: 'Landmine',
    is_rehabilitation: false,
    is_active: true
  },
  {
    name: 'Meadows Row',
    description: 'A landmine row variant standing perpendicular to the bar.',
    category: 'strength',
    equipment_type: 'heavy_gym',
    difficulty_level: 'advanced',
    muscle_groups: ['lats', 'rear delts', 'biceps'],
    body_region: 'upper_extremity',
    equipment_required: 'Landmine',
    is_rehabilitation: false,
    is_active: true
  },
  {
    name: 'Landmine Rotations (Rainbows)',
    description: 'Moving the barbell from hip to hip in an arc, highly effective for obliques.',
    category: 'strength',
    equipment_type: 'heavy_gym',
    difficulty_level: 'intermediate',
    muscle_groups: ['obliques', 'core', 'shoulders'],
    body_region: 'core',
    equipment_required: 'Landmine',
    is_rehabilitation: false,
    is_active: true
  },
  {
    name: 'Landmine Hack Squat',
    description: 'Performed by leaning your back against the barbell plates while in a squat position.',
    category: 'strength',
    equipment_type: 'heavy_gym',
    difficulty_level: 'advanced',
    muscle_groups: ['quads', 'glutes'],
    body_region: 'lower_extremity',
    equipment_required: 'Landmine',
    is_rehabilitation: false,
    is_active: true
  },
  {
    name: 'Landmine Reverse Lunge',
    description: 'Holding the landmine in opposite hand while stepping back into a lunge.',
    category: 'strength',
    equipment_type: 'heavy_gym',
    difficulty_level: 'intermediate',
    muscle_groups: ['quads', 'glutes', 'hamstrings'],
    body_region: 'lower_extremity',
    equipment_required: 'Landmine',
    is_rehabilitation: false,
    is_active: true
  },

  // SWISS BALL
  {
    name: 'Swiss Ball Crunch',
    description: 'Core crunch with mid-back on the Swiss ball, increasing rectus abdominis activation.',
    category: 'strength',
    equipment_type: 'average_gym',
    difficulty_level: 'beginner',
    muscle_groups: ['core', 'abs'],
    body_region: 'core',
    equipment_required: 'Swiss Ball',
    is_rehabilitation: false,
    is_active: true
  },
  {
    name: 'Swiss Ball Hamstring Curl',
    description: 'Bridged position curling the ball towards glutes using hamstrings.',
    category: 'strength',
    equipment_type: 'average_gym',
    difficulty_level: 'intermediate',
    muscle_groups: ['hamstrings', 'glutes', 'core'],
    body_region: 'lower_extremity',
    equipment_required: 'Swiss Ball',
    is_rehabilitation: true,
    is_active: true
  },
  {
    name: 'Swiss Ball Wall Squat',
    description: 'Ball between low back and wall, squatting down to parallel.',
    category: 'strength',
    equipment_type: 'average_gym',
    difficulty_level: 'beginner',
    muscle_groups: ['quads', 'glutes'],
    body_region: 'lower_extremity',
    equipment_required: 'Swiss Ball',
    is_rehabilitation: true,
    is_active: true
  },
  {
    name: 'Swiss Ball Plank',
    description: 'Plank with forearms on the unstable Swiss ball.',
    category: 'balance',
    equipment_type: 'average_gym',
    difficulty_level: 'intermediate',
    muscle_groups: ['core', 'shoulders'],
    body_region: 'core',
    equipment_required: 'Swiss Ball',
    is_rehabilitation: false,
    is_active: true
  },
  {
    name: 'Swiss Ball Push-Up',
    description: 'Decline (feet on ball) or Incline (hands on ball) pushup.',
    category: 'strength',
    equipment_type: 'average_gym',
    difficulty_level: 'advanced',
    muscle_groups: ['chest', 'triceps', 'shoulders', 'core'],
    body_region: 'upper_extremity',
    equipment_required: 'Swiss Ball',
    is_rehabilitation: false,
    is_active: true
  },
  {
    name: 'Swiss Ball Pike Crunch',
    description: 'Feet on ball, lifting hips high into an inverted V-shape.',
    category: 'strength',
    equipment_type: 'average_gym',
    difficulty_level: 'advanced',
    muscle_groups: ['core', 'shoulders', 'hip flexors'],
    body_region: 'core',
    equipment_required: 'Swiss Ball',
    is_rehabilitation: false,
    is_active: true
  },

  // BOSU BALL
  {
    name: 'BOSU Ball Squat',
    description: 'Standing on the dome or flat surface while squatting for added instability.',
    category: 'balance',
    equipment_type: 'average_gym',
    difficulty_level: 'intermediate',
    muscle_groups: ['quads', 'glutes', 'calves', 'core'],
    body_region: 'lower_extremity',
    equipment_required: 'BOSU Ball',
    is_rehabilitation: false,
    is_active: true
  },
  {
    name: 'BOSU Ball Push-Up',
    description: 'Hands on the dome or flat platform while performing a push-up.',
    category: 'strength',
    equipment_type: 'average_gym',
    difficulty_level: 'intermediate',
    muscle_groups: ['chest', 'shoulders', 'triceps', 'core'],
    body_region: 'upper_extremity',
    equipment_required: 'BOSU Ball',
    is_rehabilitation: false,
    is_active: true
  },
  {
    name: 'BOSU Ball Plank',
    description: 'Forearms or hands on the dome side up to build stability.',
    category: 'balance',
    equipment_type: 'average_gym',
    difficulty_level: 'beginner',
    muscle_groups: ['core', 'shoulders'],
    body_region: 'core',
    equipment_required: 'BOSU Ball',
    is_rehabilitation: true,
    is_active: true
  },
  {
    name: 'BOSU Ball Mountain Climbers',
    description: 'Hands on the flat platform, alternately driving knees towards chest.',
    category: 'strength',
    equipment_type: 'average_gym',
    difficulty_level: 'intermediate',
    muscle_groups: ['core', 'shoulders', 'hip flexors'],
    body_region: 'full_body',
    equipment_required: 'BOSU Ball',
    is_rehabilitation: false,
    is_active: true
  },
  {
    name: 'BOSU Ball Glute Bridge',
    description: 'Feet planted on the dome while lying supine, pushing hips up.',
    category: 'strength',
    equipment_type: 'average_gym',
    difficulty_level: 'beginner',
    muscle_groups: ['glutes', 'hamstrings', 'core'],
    body_region: 'lower_extremity',
    equipment_required: 'BOSU Ball',
    is_rehabilitation: true,
    is_active: true
  },
  {
    name: 'BOSU Ball Lunge',
    description: 'Forward lunge planting the lead foot onto the dome of the BOSU.',
    category: 'balance',
    equipment_type: 'average_gym',
    difficulty_level: 'intermediate',
    muscle_groups: ['quads', 'glutes', 'hamstrings'],
    body_region: 'lower_extremity',
    equipment_required: 'BOSU Ball',
    is_rehabilitation: true,
    is_active: true
  },

  // PALLOF
  {
    name: 'Standing Pallof Press',
    description: 'Standing perpendicular to a cable or band, pressing straight out and resisting rotation.',
    category: 'strength',
    equipment_type: 'average_gym',
    difficulty_level: 'beginner',
    muscle_groups: ['core', 'obliques'],
    body_region: 'core',
    equipment_required: 'Cable or Band',
    is_rehabilitation: true,
    is_active: true
  },
  {
    name: 'Half-Kneeling Pallof Press',
    description: 'Anti-rotation press with one knee down, emphasizing hip stability.',
    category: 'strength',
    equipment_type: 'average_gym',
    difficulty_level: 'intermediate',
    muscle_groups: ['core', 'obliques', 'glutes', 'hip stabilizers'],
    body_region: 'core',
    equipment_required: 'Cable or Band',
    is_rehabilitation: true,
    is_active: true
  },
  {
    name: 'Tall-Kneeling Pallof Press',
    description: 'Kneeling on both knees, pressing out to demand high rigidity from hips and core.',
    category: 'strength',
    equipment_type: 'average_gym',
    difficulty_level: 'intermediate',
    muscle_groups: ['core', 'glutes'],
    body_region: 'core',
    equipment_required: 'Cable or Band',
    is_rehabilitation: true,
    is_active: true
  },
  {
    name: 'Pallof Press with Overhead Raise',
    description: 'After extending arms forward, raise them overhead to challenge core and shoulder stability.',
    category: 'strength',
    equipment_type: 'average_gym',
    difficulty_level: 'advanced',
    muscle_groups: ['core', 'obliques', 'shoulders'],
    body_region: 'core',
    equipment_required: 'Cable or Band',
    is_rehabilitation: false,
    is_active: true
  }
];

async function seedMissingExercises() {
  const env = getEnv();
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabaseKey = env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log(`Checking and inserting ${exercisesMap.length} exercises...`);

  // We could check each and insert, or just blindly insert (upsert based on name if possible)
  // Let's do it safely
  let inserted = 0;
  for (const ex of exercisesMap) {
    const { data: existing, error: findErr } = await supabase
      .from('exercises')
      .select('id')
      .eq('name', ex.name)
      .maybeSingle();

    if (findErr) {
      console.error(`Error checking exercise ${ex.name}:`, findErr);
      continue;
    }

    if (!existing) {
      const { error: insErr } = await supabase
        .from('exercises')
        .insert([ex]);

      if (insErr) {
        console.error(`Error inserting ${ex.name}:`, insErr);
      } else {
        console.log(`Inserted: ${ex.name}`);
        inserted++;
      }
    } else {
      console.log(`Already exists: ${ex.name}`);
    }
  }

  console.log(`Finished. Inserted ${inserted} new exercises.`);
}

seedMissingExercises();
