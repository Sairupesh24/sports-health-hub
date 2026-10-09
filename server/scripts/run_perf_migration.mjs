import { db } from '../db.js';

async function migrateAndSeed() {
  console.log('[PerfMigration] Starting migration...');
  
  try {
    // 1. Create performance_protocols table
    await db.query(`
      CREATE TABLE IF NOT EXISTS performance_protocols (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
        sport_name TEXT NOT NULL,
        template_name TEXT NOT NULL,
        slug TEXT NOT NULL,
        sections_config JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_performance_protocols_slug UNIQUE (slug)
      );
    `);
    console.log('[PerfMigration] performance_protocols table verified/created.');

    // 2. Adjust columns on performance_assessments
    await db.query(`ALTER TABLE performance_assessments ALTER COLUMN category DROP NOT NULL;`).catch(() => {});
    await db.query(`ALTER TABLE performance_assessments ALTER COLUMN test_name DROP NOT NULL;`).catch(() => {});
    await db.query(`ALTER TABLE performance_assessments ALTER COLUMN metrics DROP NOT NULL;`).catch(() => {});

    const alterCols = [
      `ALTER TABLE performance_assessments ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;`,
      `ALTER TABLE performance_assessments ADD COLUMN IF NOT EXISTS assessor_id UUID REFERENCES users(id) ON DELETE SET NULL;`,
      `ALTER TABLE performance_assessments ADD COLUMN IF NOT EXISTS protocol_id UUID REFERENCES performance_protocols(id) ON DELETE SET NULL;`,
      `ALTER TABLE performance_assessments ADD COLUMN IF NOT EXISTS assessment_date DATE DEFAULT CURRENT_DATE;`,
      `ALTER TABLE performance_assessments ADD COLUMN IF NOT EXISTS batch_or_squad TEXT;`,
      `ALTER TABLE performance_assessments ADD COLUMN IF NOT EXISTS needs_analysis JSONB DEFAULT '{}'::jsonb;`,
      `ALTER TABLE performance_assessments ADD COLUMN IF NOT EXISTS anthropometrics JSONB DEFAULT '{}'::jsonb;`,
      `ALTER TABLE performance_assessments ADD COLUMN IF NOT EXISTS fms_data JSONB DEFAULT '{}'::jsonb;`,
      `ALTER TABLE performance_assessments ADD COLUMN IF NOT EXISTS stability_data JSONB DEFAULT '{}'::jsonb;`,
      `ALTER TABLE performance_assessments ADD COLUMN IF NOT EXISTS power_speed_data JSONB DEFAULT '{}'::jsonb;`,
      `ALTER TABLE performance_assessments ADD COLUMN IF NOT EXISTS agility_data JSONB DEFAULT '{}'::jsonb;`,
      `ALTER TABLE performance_assessments ADD COLUMN IF NOT EXISTS endurance_data JSONB DEFAULT '{}'::jsonb;`,
      `ALTER TABLE performance_assessments ADD COLUMN IF NOT EXISTS anaerobic_data JSONB DEFAULT '{}'::jsonb;`,
      `ALTER TABLE performance_assessments ADD COLUMN IF NOT EXISTS aerobic_data JSONB DEFAULT '{}'::jsonb;`,
      `ALTER TABLE performance_assessments ADD COLUMN IF NOT EXISTS biomotor_ratings JSONB DEFAULT '{}'::jsonb;`,
      `ALTER TABLE performance_assessments ADD COLUMN IF NOT EXISTS corrective_plan TEXT;`,
      `ALTER TABLE performance_assessments ADD COLUMN IF NOT EXISTS plan_of_action TEXT;`,
      `ALTER TABLE performance_assessments ADD COLUMN IF NOT EXISTS overall_impression TEXT;`,
      `ALTER TABLE performance_assessments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';`,
      `ALTER TABLE performance_assessments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;`
    ];

    for (const sql of alterCols) {
      await db.query(sql).catch(err => console.error('[PerfMigration] Column alter error:', err.message));
    }
    console.log('[PerfMigration] performance_assessments columns verified.');

    // 3. Create indexes
    await db.query(`CREATE INDEX IF NOT EXISTS idx_perf_assessments_athlete ON performance_assessments(athlete_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_perf_assessments_date ON performance_assessments(assessment_date DESC);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_perf_assessments_batch ON performance_assessments(batch_or_squad);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_perf_protocols_slug ON performance_protocols(slug);`);

    // 4. Seed initial sport protocols
    const protocols = [
      {
        slug: 'badminton-assessment',
        sport_name: 'Badminton',
        template_name: 'Badminton Performance Assessment',
        sections_config: {
          needs_analysis: { active: true, fields: ['sport_training_age', 'strength_training_age', 'other_sports', 'playing_hand', 'event_specialty'] },
          anthropometrics: { active: true, fields: ['standing_height', 'sitting_height', 'weight', 'body_fat_pct', 'muscle_mass_kg', 'arm_span', 'lower_limb_length_r', 'lower_limb_length_l', 'upper_limb_length_r', 'upper_limb_length_l'] },
          fms: { active: true, fields: ['ohs', 'hurdle_step', 'inline_lunge', 'shoulder_mobility', 'shoulder_clearing', 'aslr', 'trunk_pushup', 'extension_clearing', 'rotary_stability', 'flexion_clearing', 'ankle_dorsiflexion_r', 'ankle_dorsiflexion_l'] },
          stability: { active: true, ybt_lower: true, ybt_upper: true },
          flexibility: { active: true, sit_and_reach: true },
          power_speed: { active: true, vertical_jump: true, broad_jump: true, mb_throw_type: 'kneeling_oh', sprint_splits: ['10m'] },
          agility: { active: true, test_type: 'semo' },
          anaerobic: { active: true, test_type: 'mrsat', stages: 10 },
          endurance: { active: true, trunk_lines: true, push_ups: true },
          aerobic: { active: true, test_type: 'yoyo_ir1' },
          biomotor_ratings: { active: true, dimensions: ['Balance', 'Flexibility', 'Power', 'Speed', 'Agility', 'Strength', 'Aerobic/Anaerobic'] }
        }
      },
      {
        slug: 'tennis-assessment',
        sport_name: 'Tennis',
        template_name: 'Tennis Performance Assessment',
        sections_config: {
          needs_analysis: { active: true, fields: ['sport_training_age', 'strength_training_age', 'other_sports', 'dominant_hand', 'backhand_type'] },
          anthropometrics: { active: true, fields: ['standing_height', 'sitting_height', 'weight', 'body_fat_pct', 'muscle_mass_kg', 'arm_span', 'lower_limb_length_r', 'lower_limb_length_l', 'upper_limb_length_r', 'upper_limb_length_l'] },
          fms: { active: true, fields: ['ohs', 'hurdle_step', 'inline_lunge', 'shoulder_mobility', 'shoulder_clearing', 'aslr', 'trunk_pushup', 'extension_clearing', 'rotary_stability', 'flexion_clearing', 'ankle_dorsiflexion_r', 'ankle_dorsiflexion_l'] },
          stability: { active: true, ybt_lower: true, ybt_upper: true },
          flexibility: { active: true, sit_and_reach: true },
          power_speed: { active: true, vertical_jump: true, broad_jump: true, mb_throw_type: 'kneeling_rotational_rl', sprint_splits: ['10m', '20m'] },
          agility: { active: true, test_type: 'semo' },
          anaerobic: { active: true, test_type: 'rast', sprints: 6, distance: 35 },
          endurance: { active: true, trunk_lines: true },
          aerobic: { active: true, test_type: 'yoyo_ir1' },
          biomotor_ratings: { active: true, dimensions: ['Balance', 'Flexibility', 'Power', 'Speed', 'Agility', 'Strength', 'Anaerobic', 'Aerobic'] }
        }
      },
      {
        slug: 'padel-assessment',
        sport_name: 'Padel',
        template_name: 'Padel Performance Assessment',
        sections_config: {
          needs_analysis: { active: true, fields: ['sport_training_age', 'strength_training_age', 'other_sports', 'side_preference', 'dominant_hand'] },
          anthropometrics: { active: true, fields: ['standing_height', 'sitting_height', 'weight', 'body_fat_pct', 'muscle_mass_kg', 'arm_span', 'lower_limb_length_r', 'lower_limb_length_l', 'upper_limb_length_r', 'upper_limb_length_l'] },
          fms: { active: true, fields: ['ohs', 'hurdle_step', 'inline_lunge', 'shoulder_mobility', 'shoulder_clearing', 'aslr', 'trunk_pushup', 'extension_clearing', 'rotary_stability', 'flexion_clearing', 'ankle_dorsiflexion_r', 'ankle_dorsiflexion_l'] },
          stability: { active: true, ybt_lower: true, ybt_upper: true },
          flexibility: { active: true, sit_and_reach: true },
          power_speed: { active: true, vertical_jump: true, broad_jump: true, mb_throw_type: 'kneeling_rotational_rl', sprint_splits: ['10m', '20m'] },
          agility: { active: true, test_type: 'semo' },
          anaerobic: { active: true, test_type: 'rast', sprints: 6, distance: 35 },
          endurance: { active: true, trunk_lines: true },
          aerobic: { active: true, test_type: 'yoyo_ir1' },
          biomotor_ratings: { active: true, dimensions: ['Balance', 'Flexibility', 'Power', 'Speed', 'Agility', 'Strength', 'Anaerobic', 'Aerobic'] }
        }
      },
      {
        slug: 'cricket-assessment',
        sport_name: 'Cricket',
        template_name: 'Cricket Performance Assessment',
        sections_config: {
          needs_analysis: { active: true, fields: ['role', 'bowling_arm', 'batting_stance', 'sport_training_age', 'strength_training_age'], roles: ['Batsman', 'Fast Bowler', 'Spin Bowler', 'Wicketkeeper', 'All-Rounder'] },
          anthropometrics: { active: true, fields: ['standing_height', 'sitting_height', 'weight', 'body_fat_pct', 'muscle_mass_kg', 'arm_span', 'lower_limb_length_r', 'lower_limb_length_l', 'upper_limb_length_r', 'upper_limb_length_l'] },
          fms: { active: true, fields: ['ohs', 'hurdle_step', 'inline_lunge', 'shoulder_mobility', 'shoulder_clearing', 'aslr', 'trunk_pushup', 'extension_clearing', 'rotary_stability', 'flexion_clearing', 'ankle_dorsiflexion_r', 'ankle_dorsiflexion_l'] },
          stability: { active: true, ybt_lower: true, ybt_upper: true },
          power_speed: { active: true, vertical_jump: true, broad_jump: true, mb_throw_type: 'half_kneeling_mb', sprint_splits: ['10m', '20m', '40m'] },
          agility: { active: true, run_a_3: true, run_a_3_with_bat: true },
          endurance: { active: true, pull_ups: true, push_ups: true, sl_calf_raise_rl: true, trunk_lines: true },
          aerobic: { active: true, test_type: 'yoyo_irt1' },
          biomotor_ratings: { active: true, dimensions: ['Balance', 'Flexibility', 'Power', 'Speed', 'Agility', 'Strength', 'Anaerobic', 'Aerobic'] }
        }
      },
      {
        slug: 'football-senior',
        sport_name: 'Football',
        template_name: 'Football Performance Assessment (Senior)',
        sections_config: {
          needs_analysis: { active: true, fields: ['position', 'dominant_foot', 'sport_training_age', 'strength_training_age'], positions: ['Goalkeeper', 'Central Defender', 'Fullback', 'Central Midfielder', 'Winger', 'Striker'] },
          anthropometrics: { active: true, fields: ['standing_height', 'sitting_height', 'weight', 'body_fat_pct', 'muscle_mass_kg', 'lower_limb_length_r', 'lower_limb_length_l'] },
          fms: { active: true, fields: ['ohs', 'hurdle_step', 'inline_lunge', 'shoulder_mobility', 'shoulder_clearing', 'aslr', 'trunk_pushup', 'extension_clearing', 'rotary_stability', 'flexion_clearing', 'ankle_dorsiflexion_r', 'ankle_dorsiflexion_l'] },
          stability: { active: true, ybt_lower: true, ybt_upper: false },
          power_speed: { active: true, cmj_peak_power: true, drop_jump_rsi: true, mb_throw_watts: true, sprint_splits: ['10m', '30m'] },
          agility: { active: true, test_type: 't_agility' },
          aerobic: { active: true, test_type: 'yoyo_irt1' },
          biomotor_ratings: { active: true, dimensions: ['Balance', 'Flexibility', 'Power', 'Speed', 'Agility', 'Strength', 'Anaerobic', 'Aerobic'] }
        }
      },
      {
        slug: 'football-u12',
        sport_name: 'Football',
        template_name: 'Football Performance Assessment (U-12)',
        sections_config: {
          needs_analysis: { active: true, fields: ['position', 'dominant_foot', 'sport_training_age'], youth: true },
          anthropometrics: { active: true, fields: ['standing_height', 'sitting_height', 'weight', 'body_fat_pct'] },
          fms: { active: true, fields: ['ohs', 'hurdle_step', 'inline_lunge', 'shoulder_mobility', 'aslr', 'trunk_pushup', 'rotary_stability'] },
          stability: { active: true, ybt_lower: true, ybt_upper: false },
          flexibility: { active: true, sit_and_reach: true },
          power_speed: { active: true, cmj: true, broad_jump: true, mb_throw_type: 'oh_medball', sprint_splits: ['10m', '30m'] },
          agility: { active: true, test_type: 't_agility' },
          aerobic: { active: true, test_type: 'children_yoyo_irt1' },
          biomotor_ratings: { active: true, dimensions: ['Balance', 'Flexibility', 'Power', 'Speed', 'Agility', 'Strength', 'Aerobic'] }
        }
      },
      {
        slug: 'equestrian-fencing',
        sport_name: 'Equestrian/Fencing',
        template_name: 'Horse Riding & Fencing Report',
        sections_config: {
          needs_analysis: { active: true, fields: ['discipline', 'dominant_hand', 'sport_training_age', 'strength_training_age'] },
          anthropometrics: { active: true, fields: ['standing_height', 'sitting_height', 'weight', 'body_fat_pct', 'muscle_mass_kg', 'arm_span', 'lower_limb_length_r', 'lower_limb_length_l', 'upper_limb_length_r', 'upper_limb_length_l'] },
          fms: { active: true, fields: ['ohs', 'hurdle_step', 'inline_lunge', 'shoulder_mobility', 'shoulder_clearing', 'aslr', 'trunk_pushup', 'extension_clearing', 'rotary_stability', 'flexion_clearing', 'ankle_dorsiflexion_r', 'ankle_dorsiflexion_l'] },
          stability: { active: true, ybt_lower: true, ybt_upper: true, bess_balance: true },
          flexibility: { active: true, sit_and_reach: true },
          power_speed: { active: true, vertical_jump_sayers: true, broad_jump: true, handgrip_rl_trials: true, sprint_splits: ['5m', '10m', '20m'] },
          agility: { active: true, test_type: 'y_agility' },
          endurance: { active: true, modified_pullup: true, pushups: true, planks: true, sorenson: true, wall_sit: true },
          aerobic: { active: true, test_type: 'yoyo_children_ir1' },
          biomotor_ratings: { active: true, dimensions: ['Balance', 'Flexibility', 'Power', 'Speed', 'Agility', 'Strength', 'Anaerobic', 'Aerobic'] }
        }
      },
      {
        slug: 'champ-generic',
        sport_name: 'General',
        template_name: 'CHAMP Assessment',
        sections_config: {
          needs_analysis: { active: true, fields: ['primary_sport', 'training_age', 'active_interests'] },
          anthropometrics: { active: true, fields: ['standing_height', 'sitting_height', 'weight', 'body_fat_pct', 'muscle_mass_kg', 'arm_span', 'lower_limb_length_r', 'lower_limb_length_l'] },
          stability: { active: true, bess_balance: true },
          flexibility: { active: true, sit_and_reach: true },
          functional_motor: { active: true, fields: ['catch_and_throw', 'balance_beam', 'skipping_coordination', 'lateral_hop'] },
          aerobic: { active: true, test_type: 'yoyo_irt1' },
          biomotor_ratings: { active: true, dimensions: ['Balance', 'Flexibility', 'Power', 'Speed', 'Agility', 'Strength', 'Cardiorespiratory'] }
        }
      }
    ];

    for (const proto of protocols) {
      await db.query(`
        INSERT INTO performance_protocols (sport_name, template_name, slug, sections_config)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (slug) DO UPDATE
        SET sport_name = EXCLUDED.sport_name,
            template_name = EXCLUDED.template_name,
            sections_config = EXCLUDED.sections_config,
            updated_at = NOW();
      `, [proto.sport_name, proto.template_name, proto.slug, JSON.stringify(proto.sections_config)]);
      console.log(`[PerfMigration] Seeded protocol: ${proto.slug}`);
    }

    console.log('[PerfMigration] All 8 protocols seeded successfully!');
  } catch (err) {
    console.error('[PerfMigration] Fatal error:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

migrateAndSeed();
