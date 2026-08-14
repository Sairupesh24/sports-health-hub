-- ISHPO OrbitFlow Planner Database Schema Migration

CREATE TABLE IF NOT EXISTS planner_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  department TEXT DEFAULT 'General',
  priority TEXT DEFAULT 'medium',
  health TEXT DEFAULT 'on_track',
  status TEXT DEFAULT 'active',
  progress INTEGER DEFAULT 0,
  start_date DATE,
  target_date DATE,
  budget NUMERIC(15,2) DEFAULT 0.00,
  currency TEXT DEFAULT 'INR',
  owner_id UUID,
  manager_id UUID,
  portfolio_id UUID,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS planner_workstreams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES planner_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT 'hsl(251 74% 60%)',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS planner_work_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES planner_projects(id) ON DELETE CASCADE,
  workstream_id UUID REFERENCES planner_workstreams(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES planner_work_items(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'planned',
  priority TEXT DEFAULT 'medium',
  assignee_id UUID,
  creator_id UUID,
  sprint_id UUID,
  start_date DATE,
  due_date DATE,
  estimated_hours NUMERIC(8,2) DEFAULT 0.00,
  actual_hours NUMERIC(8,2) DEFAULT 0.00,
  is_milestone BOOLEAN DEFAULT FALSE,
  is_critical BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS planner_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  predecessor_id UUID REFERENCES planner_work_items(id) ON DELETE CASCADE,
  successor_id UUID REFERENCES planner_work_items(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'FS', -- Finish-to-Start (FS), Start-to-Start (SS), Finish-to-Finish (FF), Start-to-Finish (SF)
  lag_days INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(predecessor_id, successor_id)
);

CREATE TABLE IF NOT EXISTS planner_sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES planner_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  goal TEXT,
  start_date DATE,
  end_date DATE,
  capacity_hours NUMERIC(8,2) DEFAULT 40.00,
  status TEXT DEFAULT 'planned', -- planned, active, completed
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS planner_portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS planner_roadmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS planner_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES planner_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_value NUMERIC(10,2),
  current_value NUMERIC(10,2) DEFAULT 0.00,
  unit TEXT DEFAULT '%',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS planner_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES planner_projects(id) ON DELETE CASCADE,
  user_id UUID,
  user_name TEXT,
  action TEXT NOT NULL,
  subject TEXT NOT NULL,
  detail TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
