-- =============================================================
-- Migration: 20260826143500_add_planner_tables_and_sync_schema
-- Description: Adds planner tables (projects, workstreams, work items,
--              dependencies, daily tasks, teams, settings) and
--              profiles.allowed_consoles column.
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. PROFILES (allowed_consoles)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "allowed_consoles" TEXT;

-- ─────────────────────────────────────────────────────────────
-- 2. PLANNER PROJECTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "planner_projects" (
    "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "organization_id" UUID,
    "name"            TEXT NOT NULL,
    "code"            TEXT NOT NULL,
    "description"     TEXT,
    "department"      TEXT DEFAULT 'General',
    "priority"        TEXT DEFAULT 'medium',
    "health"          TEXT DEFAULT 'on_track',
    "status"          TEXT DEFAULT 'active',
    "progress"        INTEGER DEFAULT 0,
    "start_date"      DATE,
    "target_date"     DATE,
    "budget"          DECIMAL(15, 2) DEFAULT 0.00,
    "currency"        TEXT DEFAULT 'INR',
    "owner_id"        UUID,
    "manager_id"      UUID,
    "portfolio_id"    UUID,
    "created_at"      TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at"      TIMESTAMPTZ(6)
);

CREATE INDEX IF NOT EXISTS "idx_planner_projects_org" ON "planner_projects"("organization_id");

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'planner_projects_organization_id_fkey'
  ) THEN
    ALTER TABLE "planner_projects" ADD CONSTRAINT "planner_projects_organization_id_fkey" 
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 3. PLANNER WORKSTREAMS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "planner_workstreams" (
    "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "project_id" UUID,
    "name"       TEXT NOT NULL,
    "color"      TEXT DEFAULT 'hsl(251 74% 60%)',
    "sort_order" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_planner_workstreams_project" ON "planner_workstreams"("project_id");

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'planner_workstreams_project_id_fkey'
  ) THEN
    ALTER TABLE "planner_workstreams" ADD CONSTRAINT "planner_workstreams_project_id_fkey" 
    FOREIGN KEY ("project_id") REFERENCES "planner_projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 4. PLANNER WORK ITEMS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "planner_work_items" (
    "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "project_id"      UUID,
    "workstream_id"   UUID,
    "parent_id"       UUID,
    "title"           TEXT NOT NULL,
    "description"     TEXT,
    "status"          TEXT DEFAULT 'planned',
    "priority"        TEXT DEFAULT 'medium',
    "assignee_id"     UUID,
    "creator_id"      UUID,
    "sprint_id"       UUID,
    "start_date"      DATE,
    "due_date"        DATE,
    "estimated_hours" DECIMAL(8, 2) DEFAULT 0.00,
    "actual_hours"    DECIMAL(8, 2) DEFAULT 0.00,
    "is_milestone"    BOOLEAN DEFAULT false,
    "is_critical"     BOOLEAN DEFAULT false,
    "sort_order"      INTEGER DEFAULT 0,
    "created_at"      TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at"      TIMESTAMPTZ(6)
);

CREATE INDEX IF NOT EXISTS "idx_planner_work_items_project"    ON "planner_work_items"("project_id");
CREATE INDEX IF NOT EXISTS "idx_planner_work_items_workstream" ON "planner_work_items"("workstream_id");
CREATE INDEX IF NOT EXISTS "idx_planner_work_items_parent"     ON "planner_work_items"("parent_id");

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'planner_work_items_project_id_fkey'
  ) THEN
    ALTER TABLE "planner_work_items" ADD CONSTRAINT "planner_work_items_project_id_fkey" 
    FOREIGN KEY ("project_id") REFERENCES "planner_projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'planner_work_items_workstream_id_fkey'
  ) THEN
    ALTER TABLE "planner_work_items" ADD CONSTRAINT "planner_work_items_workstream_id_fkey" 
    FOREIGN KEY ("workstream_id") REFERENCES "planner_workstreams"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'planner_work_items_parent_id_fkey'
  ) THEN
    ALTER TABLE "planner_work_items" ADD CONSTRAINT "planner_work_items_parent_id_fkey" 
    FOREIGN KEY ("parent_id") REFERENCES "planner_work_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 5. PLANNER DEPENDENCIES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "planner_dependencies" (
    "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "predecessor_id" UUID NOT NULL,
    "successor_id"   UUID NOT NULL,
    "type"           TEXT DEFAULT 'FS',
    "lag_days"       INTEGER DEFAULT 0,
    "created_at"     TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "planner_dependencies_predecessor_id_successor_id_key" UNIQUE ("predecessor_id", "successor_id")
);

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'planner_dependencies_predecessor_id_fkey'
  ) THEN
    ALTER TABLE "planner_dependencies" ADD CONSTRAINT "planner_dependencies_predecessor_id_fkey" 
    FOREIGN KEY ("predecessor_id") REFERENCES "planner_work_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'planner_dependencies_successor_id_fkey'
  ) THEN
    ALTER TABLE "planner_dependencies" ADD CONSTRAINT "planner_dependencies_successor_id_fkey" 
    FOREIGN KEY ("successor_id") REFERENCES "planner_work_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 6. PLANNER DAILY TASKS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "planner_daily_tasks" (
    "id"                TEXT PRIMARY KEY,
    "organization_id"   UUID,
    "title"             TEXT NOT NULL,
    "description"       TEXT,
    "date"              TEXT NOT NULL,
    "time_mode"         TEXT,
    "start_time"        TEXT,
    "end_time"          TEXT,
    "has_time_slot"     BOOLEAN DEFAULT false,
    "is_set_time"       BOOLEAN DEFAULT false,
    "deadline"          TEXT,
    "deadline_time"     TEXT,
    "category"          TEXT DEFAULT 'other',
    "priority"          TEXT DEFAULT 'medium',
    "status"            TEXT DEFAULT 'scheduled',
    "task_type"         TEXT DEFAULT 'individual',
    "assigner_id"       TEXT,
    "assigner_name"     TEXT,
    "assignee_id"       TEXT,
    "assignee_name"     TEXT,
    "team_id"           TEXT,
    "team_name"         TEXT,
    "creator_id"        TEXT,
    "creator_name"      TEXT,
    "requires_approval" BOOLEAN DEFAULT false,
    "approver_id"       TEXT,
    "approver_name"     TEXT,
    "approval_status"   TEXT,
    "approval_note"     TEXT,
    "rejection_reason"  TEXT,
    "reviewed_at"       TEXT,
    "completed_at"      TEXT,
    "created_at"        TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at"        TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at"        TIMESTAMPTZ(6)
);

CREATE INDEX IF NOT EXISTS "idx_planner_daily_tasks_org"    ON "planner_daily_tasks"("organization_id");
CREATE INDEX IF NOT EXISTS "idx_planner_daily_tasks_date"   ON "planner_daily_tasks"("date");
CREATE INDEX IF NOT EXISTS "idx_planner_daily_tasks_status" ON "planner_daily_tasks"("status");

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'planner_daily_tasks_organization_id_fkey'
  ) THEN
    ALTER TABLE "planner_daily_tasks" ADD CONSTRAINT "planner_daily_tasks_organization_id_fkey" 
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 7. PLANNER TEAMS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "planner_teams" (
    "id"              TEXT PRIMARY KEY,
    "organization_id" UUID,
    "name"            TEXT NOT NULL,
    "code"            TEXT NOT NULL,
    "department"      TEXT NOT NULL,
    "description"     TEXT,
    "color"           TEXT,
    "lead_id"         TEXT,
    "lead_name"       TEXT,
    "member_ids"      JSONB DEFAULT '[]'::jsonb,
    "created_at"      TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at"      TIMESTAMPTZ(6)
);

CREATE INDEX IF NOT EXISTS "idx_planner_teams_org" ON "planner_teams"("organization_id");

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'planner_teams_organization_id_fkey'
  ) THEN
    ALTER TABLE "planner_teams" ADD CONSTRAINT "planner_teams_organization_id_fkey" 
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 8. PLANNER SETTINGS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "planner_settings" (
    "id"              TEXT PRIMARY KEY,
    "organization_id" UUID,
    "settings"        JSONB NOT NULL,
    "updated_at"      TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_planner_settings_org" ON "planner_settings"("organization_id");

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'planner_settings_organization_id_fkey'
  ) THEN
    ALTER TABLE "planner_settings" ADD CONSTRAINT "planner_settings_organization_id_fkey" 
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;
