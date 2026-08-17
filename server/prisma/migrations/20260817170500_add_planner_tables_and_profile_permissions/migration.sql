-- AlterTable: Add missing columns to organizations
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "allow_custom_duration" BOOLEAN DEFAULT false;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "default_slot_duration" INTEGER DEFAULT 60;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "default_checkout_time" TIME(6) DEFAULT '18:00:00'::time without time zone;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "default_shift_end_time" TIME(6) DEFAULT '18:00:00'::time without time zone;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "enabled_modules" TEXT;

-- AlterTable: Add module & permissions columns to profiles
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "has_calendar_access" BOOLEAN DEFAULT false;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "has_analytics_access" BOOLEAN DEFAULT false;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "has_assign_work_access" BOOLEAN DEFAULT false;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "allowed_consoles" TEXT;

-- CreateTable: planner_projects
CREATE TABLE IF NOT EXISTS "planner_projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "department" TEXT DEFAULT 'General',
    "priority" TEXT DEFAULT 'medium',
    "health" TEXT DEFAULT 'on_track',
    "status" TEXT DEFAULT 'active',
    "progress" INTEGER DEFAULT 0,
    "start_date" DATE,
    "target_date" DATE,
    "budget" DECIMAL(15,2) DEFAULT 0.00,
    "currency" TEXT DEFAULT 'INR',
    "owner_id" UUID,
    "manager_id" UUID,
    "portfolio_id" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "planner_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable: planner_workstreams
CREATE TABLE IF NOT EXISTS "planner_workstreams" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID,
    "name" TEXT NOT NULL,
    "color" TEXT DEFAULT 'hsl(251 74% 60%)',
    "sort_order" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "planner_workstreams_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "planner_workstreams_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "planner_projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable: planner_work_items
CREATE TABLE IF NOT EXISTS "planner_work_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID,
    "workstream_id" UUID,
    "parent_id" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT DEFAULT 'planned',
    "priority" TEXT DEFAULT 'medium',
    "assignee_id" UUID,
    "creator_id" UUID,
    "sprint_id" UUID,
    "start_date" DATE,
    "due_date" DATE,
    "estimated_hours" DECIMAL(8,2) DEFAULT 0.00,
    "actual_hours" DECIMAL(8,2) DEFAULT 0.00,
    "is_milestone" BOOLEAN DEFAULT false,
    "is_critical" BOOLEAN DEFAULT false,
    "sort_order" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "planner_work_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "planner_work_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "planner_projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "planner_work_items_workstream_id_fkey" FOREIGN KEY ("workstream_id") REFERENCES "planner_workstreams"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
    CONSTRAINT "planner_work_items_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "planner_work_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable: planner_dependencies
CREATE TABLE IF NOT EXISTS "planner_dependencies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "predecessor_id" UUID NOT NULL,
    "successor_id" UUID NOT NULL,
    "type" TEXT DEFAULT 'FS',
    "lag_days" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "planner_dependencies_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "planner_dependencies_predecessor_id_successor_id_key" UNIQUE ("predecessor_id", "successor_id"),
    CONSTRAINT "planner_dependencies_predecessor_id_fkey" FOREIGN KEY ("predecessor_id") REFERENCES "planner_work_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "planner_dependencies_successor_id_fkey" FOREIGN KEY ("successor_id") REFERENCES "planner_work_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
