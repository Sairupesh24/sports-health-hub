export type SportProtocolSlug = 
  | 'badminton-assessment'
  | 'tennis-assessment'
  | 'padel-assessment'
  | 'cricket-assessment'
  | 'football-senior'
  | 'football-u12'
  | 'equestrian-fencing'
  | 'champ-generic';

export interface PerformanceProtocol {
  id: string;
  org_id?: string | null;
  sport_name: string;
  template_name: string;
  slug: string;
  sections_config: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface AthleteInjury {
  id?: string;
  diagnosis: string;
  injury_type: string;
  region: string;
  side?: string;
  status: string;
  injury_date?: string;
  notes?: string;
}

export interface AthleteDemographic {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  uhid: string;
  dob?: string;
  age?: number;
  gender?: string;
  mobile_no?: string;
  sport?: string;
  athlete_type?: string;
  org_name?: string;
  injuries?: AthleteInjury[];
  active_injuries_count?: number;
}

export interface NeedsAnalysisData {
  sport_training_age?: number | string;
  strength_training_age?: number | string;
  other_sports?: string;
  role?: string;
  dominant_foot?: string;
  dominant_hand?: string;
  playing_hand?: string;
  event_specialty?: string;
  bowling_arm?: string;
  batting_stance?: string;
  position?: string;
  discipline?: string;
  [key: string]: any;
}

export interface AnthropometricsData {
  standing_height?: number | string; // cm
  sitting_height?: number | string; // cm
  weight?: number | string; // kg
  skeletal_muscle_mass?: number | string; // kg
  body_fat_pct?: number | string; // %
  desired_fat_pct?: number | string; // %
  arm_span?: number | string; // cm
  lower_limb_length_r?: number | string; // cm
  lower_limb_length_l?: number | string; // cm
  upper_limb_length_r?: number | string; // cm
  upper_limb_length_l?: number | string; // cm
  [key: string]: any;
}

export interface FMSMovementScore {
  right?: number;
  left?: number;
  clearing?: boolean; // true = pain present
  final?: number;
}

export interface FMSData {
  ohs?: { final?: number };
  hurdle_step?: FMSMovementScore;
  inline_lunge?: FMSMovementScore;
  shoulder_mobility?: FMSMovementScore; // clearing: shoulder impingement
  aslr?: FMSMovementScore;
  trunk_pushup?: FMSMovementScore; // clearing: spinal extension
  rotary_stability?: FMSMovementScore; // clearing: spinal flexion
  ankle_dorsiflexion_r?: number | string;
  ankle_dorsiflexion_l?: number | string;
  total_score?: number; // /21
  observations?: string;
  [key: string]: any;
}

export interface StabilityData {
  // Lower YBT
  ybt_lq_anterior_r?: number | string;
  ybt_lq_anterior_l?: number | string;
  ybt_lq_pm_r?: number | string;
  ybt_lq_pm_l?: number | string;
  ybt_lq_pl_r?: number | string;
  ybt_lq_pl_l?: number | string;
  ybt_lq_diff_anterior?: number | string;
  ybt_lq_diff_pm?: number | string;
  ybt_lq_diff_pl?: number | string;
  ybt_lq_composite_r?: number | string;
  ybt_lq_composite_l?: number | string;

  // Upper YBT
  ybt_uq_medial_r?: number | string;
  ybt_uq_medial_l?: number | string;
  ybt_uq_sl_r?: number | string;
  ybt_uq_sl_l?: number | string;
  ybt_uq_il_r?: number | string;
  ybt_uq_il_l?: number | string;
  ybt_uq_diff_medial?: number | string;
  ybt_uq_composite_r?: number | string;
  ybt_uq_composite_l?: number | string;

  // BESS
  bess_firm_double?: number | string;
  bess_firm_single?: number | string;
  bess_firm_tandem?: number | string;
  bess_foam_double?: number | string;
  bess_foam_single?: number | string;
  bess_foam_tandem?: number | string;
  bess_total_errors?: number | string;
  [key: string]: any;
}

export interface PowerSpeedData {
  vertical_jump?: number | string; // cm
  vertical_jump_power_watts?: number | string; // Sayers
  broad_jump?: number | string; // cm
  drop_jump_height?: number | string; // cm
  drop_jump_contact_time?: number | string; // ms or s
  drop_jump_rsi?: number | string;
  
  // Med Ball Throws
  mb_throw_type?: string;
  mb_throw_overhead?: number | string; // m
  mb_throw_rotational_r?: number | string; // m
  mb_throw_rotational_l?: number | string; // m
  mb_throw_half_kneeling?: number | string; // m
  mb_throw_watts?: number | string;

  // Hand Grip
  handgrip_r_trial1?: number | string;
  handgrip_r_trial2?: number | string;
  handgrip_r_best?: number | string;
  handgrip_l_trial1?: number | string;
  handgrip_l_trial2?: number | string;
  handgrip_l_best?: number | string;

  // Sprint splits
  sprint_5m?: number | string;
  sprint_10m?: number | string;
  sprint_20m?: number | string;
  sprint_30m?: number | string;
  sprint_40m?: number | string;
  [key: string]: any;
}

export interface AgilityData {
  semo_time?: number | string;
  t_agility_time?: number | string;
  y_agility_time?: number | string;
  run_a_3_without_bat?: number | string;
  run_a_3_with_bat?: number | string;
  trials_count?: number;
  best_score?: number | string;
  observations?: string;
  [key: string]: any;
}

export interface EnduranceData {
  chin_up_hold_sec?: number | string;
  pull_ups_count?: number | string;
  modified_pullup_count?: number | string;
  push_ups_count?: number | string;
  sl_calf_raise_r?: number | string;
  sl_calf_raise_l?: number | string;
  
  // Trunk Endurance Lines
  trunk_apl_sec?: number | string; // Anterior Plumb Line
  trunk_lsl_sec?: number | string; // Left Side Lateral
  trunk_rsl_sec?: number | string; // Right Side Lateral
  trunk_ppl_sec?: number | string; // Posterior Plumb Line
  trunk_sorenson_sec?: number | string;
  trunk_wall_sit_sec?: number | string;
  [key: string]: any;
}

export interface AnaerobicData {
  test_type?: 'mrsat' | 'rast' | string;
  // MRSAT 10-interval
  mrsat_stages?: Array<{ stage: number; time_sec: number | string; completed: boolean }>;
  mrsat_stage_completed?: number;

  // RAST 6-interval
  rast_sprints?: Array<{ sprint: number; time_sec: number | string; power_watts: number | string }>;
  rast_peak_power?: number | string;
  rast_min_power?: number | string;
  rast_avg_power?: number | string;
  rast_fatigue_index?: number | string; // W/s
  [key: string]: any;
}

export interface AerobicData {
  test_variant?: 'Yo-Yo IR1' | 'Yo-Yo IR2' | 'Children Yo-Yo IR1' | string;
  resting_hr?: number | string;
  max_hr?: number | string;
  recovery_hr_1min?: number | string;
  distance_meters?: number | string;
  level_shuttle?: string;
  running_speed?: number | string;
  vo2_max_calculated?: number | string;
  [key: string]: any;
}

export type BiomotorTier = 'Poor' | 'Average' | 'Good' | 'Excellent' | 'Elite';

export interface BiomotorRatings {
  Balance?: BiomotorTier;
  Flexibility?: BiomotorTier;
  Power?: BiomotorTier;
  Speed?: BiomotorTier;
  Agility?: BiomotorTier;
  Strength?: BiomotorTier;
  Anaerobic?: BiomotorTier;
  Aerobic?: BiomotorTier;
  [key: string]: BiomotorTier | undefined;
}

export interface PerformanceAssessmentPayload {
  id?: string;
  org_id?: string;
  athlete_id: string;
  assessor_id?: string;
  protocol_id?: string;
  assessment_date: string;
  batch_or_squad?: string;
  needs_analysis: NeedsAnalysisData;
  anthropometrics: AnthropometricsData;
  fms_data: FMSData;
  stability_data: StabilityData;
  power_speed_data: PowerSpeedData;
  agility_data: AgilityData;
  endurance_data: EnduranceData;
  anaerobic_data: AnaerobicData;
  aerobic_data: AerobicData;
  biomotor_ratings: BiomotorRatings;
  corrective_plan?: string;
  plan_of_action?: string;
  overall_impression?: string;
  status: 'draft' | 'completed';
  created_at?: string;
  updated_at?: string;

  // Joined presentation fields
  athlete_name?: string;
  athlete_first_name?: string;
  athlete_last_name?: string;
  athlete_uhid?: string;
  athlete_gender?: string;
  athlete_dob?: string;
  athlete_age?: number;
  athlete_mobile_no?: string;
  athlete_sport?: string;
  athlete_type?: string;
  athlete_injuries?: AthleteInjury[];
  sport_name?: string;
  template_name?: string;
  protocol_slug?: string;
  assessor_name?: string;
}
