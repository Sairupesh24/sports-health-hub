// ============================================================
// ISHPO Planner — TypeScript Type Definitions
// ============================================================

// ---- Enums ----

export type PlannerWorkspaceRole = 'owner' | 'admin' | 'manager' | 'contributor' | 'viewer';

export type ProjectStatus = 'not_started' | 'active' | 'on_hold' | 'completed' | 'archived';
export type ProjectHealth = 'on_track' | 'at_risk' | 'delayed' | 'blocked' | 'completed' | 'not_started';
export type ProjectPriority = 'critical' | 'high' | 'medium' | 'low';

export type WorkItemStatus = 'planned' | 'ready' | 'in_progress' | 'review' | 'blocked' | 'completed';
export type WorkItemPriority = 'critical' | 'high' | 'medium' | 'low';
export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';

export type SprintStatus = 'planned' | 'active' | 'completed';
export type MilestoneStatus = 'pending' | 'reached' | 'at_risk' | 'missed';
export type ObjectiveStatus = 'draft' | 'active' | 'completed' | 'cancelled';
export type MetricType = 'percentage' | 'number' | 'currency' | 'boolean';

export type CustomFieldType = 'text' | 'number' | 'date' | 'boolean' | 'dropdown';
export type ViewType = 'board' | 'table' | 'schedule' | 'backlog' | 'sprint';
export type WidgetType = 'project_summary' | 'sprint_burndown' | 'resource_allocation' | 'objective_progress' | 'overdue_items' | 'activity_feed';

export type NotificationType = 'assignment' | 'mention' | 'due_date' | 'status_change' | 'comment' | 'dependency';
export type AuditAction = 'create' | 'update' | 'delete' | 'archive' | 'restore';
export type EntityType = 'project' | 'work_item' | 'workstream' | 'sprint' | 'milestone' | 'objective' | 'portfolio' | 'roadmap' | 'workspace';

// ---- Workspace ----

export interface PlannerWorkspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  owner_id: string;
  organization_id: string;
  currency: string;
  week_start: 0 | 1; // 0 = Sunday, 1 = Monday
  created_at: string;
  member_count?: number;
  project_count?: number;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: PlannerWorkspaceRole;
  joined_at: string;
  user?: UserSummary;
}

// ---- Project ----

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  code: string;
  description?: string;
  owner_id: string;
  manager_id?: string;
  status: ProjectStatus;
  health: ProjectHealth;
  priority: ProjectPriority;
  start_date?: string;
  target_date?: string;
  actual_date?: string;
  budget?: number;
  currency?: string;
  department?: string;
  tags?: string[];
  is_archived: boolean;
  created_at: string;
  updated_at?: string;
  // Computed
  completion_percentage?: number;
  open_items?: number;
  overdue_items?: number;
  blocked_items?: number;
  owner?: UserSummary;
  manager?: UserSummary;
}

export interface ProjectMember {
  project_id: string;
  user_id: string;
  role: PlannerWorkspaceRole;
  added_at: string;
  user?: UserSummary;
}

// ---- Workstream ----

export interface Workstream {
  id: string;
  project_id: string;
  name: string;
  color: string;
  owner_id?: string;
  position: number;
  created_at: string;
  item_count?: number;
  owner?: UserSummary;
}

// ---- Work Item ----

export interface WorkItem {
  id: string;
  project_id: string;
  workstream_id?: string;
  parent_id?: string;
  title: string;
  description_json?: any;
  status: WorkItemStatus;
  priority: WorkItemPriority;
  start_date?: string;
  due_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
  milestone_id?: string;
  sprint_id?: string;
  position: number;
  is_archived: boolean;
  created_at: string;
  updated_at?: string;
  // Relations
  workstream?: Workstream;
  assignees?: WorkItemAssignment[];
  checklist?: ChecklistItem[];
  tags?: Tag[];
  dependencies?: WorkItemDependency[];
  children?: WorkItem[];
  comment_count?: number;
  attachment_count?: number;
  // CPM fields
  early_start?: string;
  early_finish?: string;
  late_start?: string;
  late_finish?: string;
  float?: number;
  is_critical?: boolean;
}

export interface WorkItemAssignment {
  work_item_id: string;
  user_id: string;
  role: 'assignee' | 'contributor';
  assigned_at: string;
  user?: UserSummary;
}

export interface WorkItemDependency {
  id: string;
  predecessor_id: string;
  successor_id: string;
  type: DependencyType;
  lag_days: number;
  predecessor?: WorkItem;
  successor?: WorkItem;
}

export interface WorkItemComment {
  id: string;
  work_item_id: string;
  author_id: string;
  body_json: any;
  created_at: string;
  updated_at?: string;
  author?: UserSummary;
}

export interface WorkItemActivity {
  id: string;
  work_item_id: string;
  actor_id: string;
  action: string;
  old_value?: string;
  new_value?: string;
  created_at: string;
  actor?: UserSummary;
}

// ---- Checklist ----

export interface ChecklistItem {
  id: string;
  work_item_id: string;
  title: string;
  is_done: boolean;
  position: number;
  assignee_id?: string;
  due_date?: string;
  assignee?: UserSummary;
}

// ---- Attachment ----

export interface Attachment {
  id: string;
  work_item_id?: string;
  project_id?: string;
  uploaded_by: string;
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  uploader?: UserSummary;
}

// ---- Tag ----

export interface Tag {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
}

// ---- Milestone ----

export interface Milestone {
  id: string;
  project_id: string;
  name: string;
  target_date: string;
  status: MilestoneStatus;
  linked_work_item_id?: string;
  created_at: string;
}

// ---- Sprint ----

export interface Sprint {
  id: string;
  project_id: string;
  name: string;
  goal?: string;
  start_date: string;
  end_date: string;
  status: SprintStatus;
  capacity_hours?: number;
  created_at: string;
  // Computed
  item_count?: number;
  completed_count?: number;
  velocity?: number;
}

export interface SprintBurndownPoint {
  date: string;
  remaining: number;
  ideal: number;
}

// ---- Objectives / OKRs ----

export interface Objective {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  owner_id?: string;
  start_date?: string;
  end_date?: string;
  status: ObjectiveStatus;
  created_at: string;
  key_results?: KeyResult[];
  overall_progress?: number;
  owner?: UserSummary;
}

export interface KeyResult {
  id: string;
  objective_id: string;
  name: string;
  metric_type: MetricType;
  target_value: number;
  current_value: number;
  unit?: string;
  progress?: number;
}

// ---- Portfolio ----

export interface Portfolio {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  owner_id?: string;
  created_at: string;
  project_count?: number;
  owner?: UserSummary;
  projects?: Project[];
}

// ---- Roadmap ----

export interface Roadmap {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  created_at: string;
  items?: RoadmapItem[];
  key_dates?: RoadmapKeyDate[];
}

export interface RoadmapItem {
  id: string;
  roadmap_id: string;
  project_id?: string;
  label: string;
  start_date: string;
  end_date: string;
  color: string;
  position: number;
  project?: Project;
}

export interface RoadmapKeyDate {
  id: string;
  roadmap_id: string;
  label: string;
  date: string;
  color: string;
}

// ---- Resources ----

export interface ResourceCapacity {
  id: string;
  workspace_id: string;
  user_id: string;
  week_start: string;
  capacity_hours: number;
  user?: UserSummary;
}

export interface ResourceAllocation {
  id: string;
  work_item_id: string;
  user_id: string;
  allocated_hours: number;
  week_start: string;
  work_item?: WorkItem;
  user?: UserSummary;
}

export interface ResourceUtilization {
  user: UserSummary;
  weeks: {
    week_start: string;
    capacity_hours: number;
    allocated_hours: number;
    utilization_pct: number;
  }[];
}

// ---- Calendar ----

export interface PlannerCalendar {
  id: string;
  workspace_id: string;
  name: string;
  working_days: number[];
  working_hours_start: string;
  working_hours_end: string;
}

export interface CalendarException {
  id: string;
  calendar_id: string;
  exception_date: string;
  is_working_day: boolean;
  label?: string;
}

// ---- Custom Fields ----

export interface CustomField {
  id: string;
  workspace_id?: string;
  project_id?: string;
  name: string;
  field_type: CustomFieldType;
  options_json?: string[];
}

export interface CustomFieldValue {
  custom_field_id: string;
  entity_id: string;
  entity_type: string;
  value_text?: string;
  value_number?: number;
  value_date?: string;
  value_boolean?: boolean;
}

// ---- Templates & Views ----

export interface ProjectTemplate {
  id: string;
  workspace_id: string;
  name: string;
  config_json: any;
  created_by: string;
  created_at: string;
}

export interface SavedView {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  view_type: ViewType;
  filters_json: any;
  columns_json: any;
}

// ---- Notifications ----

export interface PlannerNotification {
  id: string;
  workspace_id: string;
  recipient_id: string;
  type: NotificationType;
  title: string;
  body?: string;
  entity_id?: string;
  entity_type?: EntityType;
  is_read: boolean;
  created_at: string;
}

// ---- Audit ----

export interface AuditEvent {
  id: string;
  workspace_id: string;
  actor_id: string;
  entity_id: string;
  entity_type: EntityType;
  action: AuditAction;
  old_json?: any;
  new_json?: any;
  created_at: string;
  actor?: UserSummary;
}

// ---- Shared ----

export interface UserSummary {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  avatar_url?: string;
  role?: string;
  profession?: string;
  full_name?: string;
}

// ---- UI State Types ----

export interface WorkItemFilter {
  status?: WorkItemStatus[];
  priority?: WorkItemPriority[];
  assignee_ids?: string[];
  workstream_ids?: string[];
  tag_ids?: string[];
  sprint_id?: string;
  due_date_from?: string;
  due_date_to?: string;
  search?: string;
  show_archived?: boolean;
}

export interface GanttZoom {
  level: 'day' | 'week' | 'month' | 'quarter';
  cellWidth: number;
}

export interface GanttViewState {
  zoom: GanttZoom;
  showCriticalPath: boolean;
  showBaseline: boolean;
  scrollLeft: number;
  expandedWorkstreams: string[];
}

export interface KanbanColumn {
  status: WorkItemStatus;
  label: string;
  color: string;
  wip_limit?: number;
  items: WorkItem[];
}

// ---- API Response Wrappers ----

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
}

export interface ApiError {
  error: string;
  details?: any;
}
