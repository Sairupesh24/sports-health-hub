export type ClientType = 'athlete' | 'general';

export type DietaryPreference = 'Vegetarian' | 'Non-Vegetarian' | 'Ovo-Vegetarian' | 'Vegan' | 'Not Set';

export interface SupplementItem {
  id: string;
  supplement_name: string;
  brand: string;
  dosage: string;
  consumption_time: string;
}

export interface FuelingSession {
  id?: string;
  name?: string;
  pre_workout: string;
  during_workout: string;
  post_workout: string;
}

export interface RecallTimeline {
  early_morning: string;
  breakfast: string;
  mid_morning: string;
  lunch: string;
  evening_snack: string;
  dinner: string;
  bed_time: string;
}

export interface MedicalConditionItem {
  id: string;
  condition: string;
  since?: string;
  treatment?: string;
}

export interface NutritionAssessment {
  id?: string;
  client_id: string;
  organization_id?: string;
  nutritionist_id?: string;

  // Section A: Personal & Client Type Logic
  name: string;
  age: number | string;
  gender: string;
  profession: string;
  client_type: ClientType;
  
  // Athlete specific
  sport?: string;
  position?: string;
  training_age?: string;
  competition_level?: string;

  // General Population specific
  exercise?: boolean;
  exercise_duration?: string;
  training_sessions_count?: number | string;
  exercise_type?: string;

  // Section B: Anthropometrics & Clinical Baseline
  height_cm: number | string;
  weight_kg: number | string;
  body_fat_pct?: number | string;
  muscle_mass_kg?: number | string;
  bmi?: number | string;
  complaints?: string;
  biochemical_interpretations?: string;
  medical_history?: string;
  comorbidities?: MedicalConditionItem[];
  other_medications?: string;
  allergies_intolerances: string[];

  // Section C: Dietary Habits & 24-Hour Recall
  dietary_preference: DietaryPreference;
  sleep_duration_hours?: number | string;
  daily_fluid_intake_l?: number | string;
  timeline_recall: RecallTimeline;

  // Section D: Training Nutrition (Fueling Strategy)
  session_1: FuelingSession;
  session_2: FuelingSession;
  fueling_sessions?: FuelingSession[];

  // Section E: Supplement Stack
  supplements: SupplementItem[];

  // Section F: Clinical Summary & Advice
  observations?: string;
  goal?: string;
  advice_prescription?: string;
  taken_by: string;
  assessment_date: string;
  created_at?: string;
  updated_at?: string;
}

export interface NutritionClient {
  id: string;
  name: string;
  uhid: string;
  sport_or_goal: string;
  preference: DietaryPreference;
  last_assessment_date: string | null;
  next_follow_up: string | null;
  client_type: ClientType;
  allergies: string[];
  adherence_rate: number;
  status: 'Active' | 'Pending Assessment' | 'High Risk';
  target_calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fats_g?: number;
}

export interface TodayAppointment {
  id: string;
  scheduled_start: string;
  service_type: string;
  status: string;
  client_id: string;
  client_name: string;
  uhid: string;
  sport_or_goal: string;
  preference: DietaryPreference | string;
  allergies: string[];
  last_assessment_date: string | null;
}

export interface RecentRegistrationClient {
  id: string;
  name: string;
  uhid: string;
  registered_on: string | null;
  mobile_no: string;
  email: string;
  sport_or_goal: string;
  preference: DietaryPreference | string;
  client_type: ClientType;
  allergies: string[];
}

export interface NutritionDashboardStats {
  totalActiveDietClients: number;
  consultationsScheduledToday: number;
  avgAdherenceRate: number;
  criticalAlertsCount: number;
  todayAppointments?: TodayAppointment[];
  latestRegisteredClient?: RecentRegistrationClient | null;
  recentRegistrations?: RecentRegistrationClient[];
  clients: NutritionClient[];
}
