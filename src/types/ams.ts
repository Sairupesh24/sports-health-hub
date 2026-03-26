export type ExerciseCategory = 'strength' | 'mobility' | 'balance' | 'plyometric' | 'flexibility';

export type EquipmentType = 'heavy_gym' | 'average_gym' | 'minimal_equipment' | 'calisthenics';

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export type BodyRegion = 
  | 'shoulder' 
  | 'knee' 
  | 'ankle' 
  | 'hip' 
  | 'spine' 
  | 'upper_extremity' 
  | 'lower_extremity' 
  | 'core' 
  | 'full_body';

export interface Exercise {
  id: string;
  name: string;
  description?: string;
  category: ExerciseCategory;
  equipment_type: EquipmentType;
  difficulty_level: DifficultyLevel;
  muscle_groups: string[];
  body_region: BodyRegion;
  equipment_required?: string;
  instructions?: string;
  video_url?: string;
  is_rehabilitation: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface WorkoutSet {
  id?: string;
  workout_log_id: string;
  exercise_id: string;
  set_number: number;
  weight_kg: number;
  reps: number;
  rpe_per_set?: number;
  equipment_type?: string;
  created_at?: string;
}

export interface WorkoutLog {
  id: string;
  session_id: string;
  notes?: string;
  created_at?: string;
  sets?: WorkoutSet[];
}

export interface TrainingSession {
  id: string;
  athlete_id: string;
  session_date: string;
  sport_type: string;
  duration_mins: number;
  rpe: number;
  calculated_load: number;
  status: 'planned' | 'completed' | 'missed';
  notes?: string;
}
