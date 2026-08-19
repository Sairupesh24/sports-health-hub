// ============================================================
// OrbitFlow Daily Task Scheduler — TypeScript Type Definitions
// ============================================================

export type DailyTaskStatus = 'scheduled' | 'in_progress' | 'under_review' | 'approved' | 'completed' | 'rejected';
export type DailyTaskPriority = 'critical' | 'high' | 'medium' | 'low';
export type DailyTaskCategory = 'clinical_care' | 'rehab_evaluation' | 'staff_briefing' | 'equipment_check' | 'administrative' | 'training' | 'other';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type TaskType = 'individual' | 'group';
export type TaskTimeMode = 'range' | 'set_time' | 'flexible';

export interface UserSummary {
  id: string;
  name: string;
  email?: string;
  role?: string;
  avatar?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email?: string;
  role: string;
  department?: string;
  avatar?: string;
}

export interface TaskTeam {
  id: string;
  name: string;
  code: string;
  department: string;
  description?: string;
  color: string;
  lead_id?: string;
  lead_name?: string;
  member_ids: string[];
  members?: TeamMember[];
  created_at: string;
}

export interface DailyTask {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD (start/scheduled date or created date)
  time_mode?: TaskTimeMode; // 'range' | 'set_time' | 'flexible'
  start_time?: string; // HH:MM, e.g. "09:00" (start time or single set time)
  end_time?: string; // HH:MM, e.g. "10:30" (optional if set time or flexible)
  has_time_slot?: boolean; // false when task only has a deadline
  is_set_time?: boolean; // true when task is scheduled at a single set time without end time
  deadline?: string; // YYYY-MM-DD (due date deadline)
  deadline_time?: string; // HH:MM, e.g. "17:00" (optional deadline time)
  category: DailyTaskCategory;
  priority: DailyTaskPriority;
  status: DailyTaskStatus;
  
  // Separation: Individual vs Group Task
  task_type: TaskType;
  
  // Assigner (Who is assigning the task)
  assigner_id?: string;
  assigner_name?: string;
  
  // Assignee Individual (For Individual tasks)
  assignee_id?: string;
  assignee_name?: string;

  // Assigned Group / Team (For Group tasks)
  team_id?: string;
  team_name?: string;

  creator_id?: string;
  creator_name?: string;
  
  // Approval workflow (Remains same for both individual and group tasks)
  requires_approval: boolean;
  approver_id?: string;
  approver_name?: string;
  approval_status?: ApprovalStatus;
  approval_note?: string;
  rejection_reason?: string;
  reviewed_at?: string;
  completed_at?: string;
  
  created_at: string;
  updated_at?: string;
}

export interface ApprovalRequest {
  id: string;
  task_id: string;
  task_title: string;
  task_date: string;
  task_time: string;
  team_name?: string;
  requested_by_id: string;
  requested_by_name: string;
  approver_id: string;
  approver_name: string;
  status: ApprovalStatus;
  approval_note?: string;
  rejection_reason?: string;
  submitted_at: string;
  reviewed_at?: string;
  task?: DailyTask;
}

// Backward-compatibility stubs for legacy components
export type PlannerWorkspaceRole = 'owner' | 'admin' | 'manager' | 'contributor' | 'viewer';
export type WorkItemStatus = 'planned' | 'ready' | 'in_progress' | 'review' | 'blocked' | 'completed';
export type WorkItemPriority = 'critical' | 'high' | 'medium' | 'low';
export interface Project {
  id: string;
  name: string;
  code: string;
  description?: string;
  status: string;
  progress: number;
}
