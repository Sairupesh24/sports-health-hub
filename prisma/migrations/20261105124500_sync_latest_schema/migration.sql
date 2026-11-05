-- =============================================================
-- Migration: 20261105124500_sync_latest_schema
-- Description:
--   1. Ensures sessions table has actual_start, actual_end, and session_location columns.
--   2. Updates sessions_status_check constraint to include all active and live statuses:
--      'Planned', 'Completed', 'Missed', 'Rescheduled', 'Cancelled', 'Checked In',
--      'Waitlisted', 'Reassigned', 'IN_PROGRESS', 'In Progress', 'SCHEDULED', 'Deleted', 'DELETED'.
--   3. Adds performance and composite query indexes on sessions (session_location, (organization_id, session_location)).
--   4. Ensures locations table exists with composite index on (organization_id, name).
--   5. Seeds standard clinic session locations (CSSH, HPL, PGBA Ground) for existing organizations.
--   6. Ensures profiles table has has_kb_edit_access column for Knowledge Base editor authorization.
--   7. Ensures audit_logs entity_id column is TEXT to support non-UUID and composite identifiers.
--   8. Ensures knowledge_base_articles and knowledge_base_revisions structures, hierarchy columns, and indexes.
-- =============================================================

-- 1. Ensure timing and location columns exist on sessions
ALTER TABLE "sessions"
    ADD COLUMN IF NOT EXISTS "actual_start" TIMESTAMPTZ(6),
    ADD COLUMN IF NOT EXISTS "actual_end" TIMESTAMPTZ(6),
    ADD COLUMN IF NOT EXISTS "session_location" TEXT;

-- 2. Update status constraint on sessions table to include IN_PROGRESS and In Progress
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'sessions_status_check' 
          AND conrelid = 'sessions'::regclass
    ) THEN
        ALTER TABLE "sessions" DROP CONSTRAINT "sessions_status_check";
    END IF;

    ALTER TABLE "sessions" ADD CONSTRAINT "sessions_status_check" 
        CHECK (status = ANY (ARRAY[
            'Planned'::text, 
            'Completed'::text, 
            'Missed'::text, 
            'Rescheduled'::text, 
            'Cancelled'::text, 
            'Checked In'::text, 
            'Waitlisted'::text, 
            'Reassigned'::text, 
            'IN_PROGRESS'::text, 
            'In Progress'::text, 
            'SCHEDULED'::text, 
            'Deleted'::text, 
            'DELETED'::text
        ]));
END $$;

-- 3. Ensure indexes on sessions for location search and fast lookup
CREATE INDEX IF NOT EXISTS "idx_sessions_session_location" ON "sessions"("session_location");
CREATE INDEX IF NOT EXISTS "idx_sessions_org_session_location" ON "sessions"("organization_id", "session_location");

-- 4. Ensure locations table and indexes exist
CREATE TABLE IF NOT EXISTS "locations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'locations_organization_id_fkey') THEN
        ALTER TABLE "locations"
            ADD CONSTRAINT "locations_organization_id_fkey"
            FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_locations_org_name" ON "locations"("organization_id", "name");

-- 5. Seed default clinic locations for existing organizations
INSERT INTO "locations" ("organization_id", "name")
SELECT o."id", l."name"
FROM "organizations" o
CROSS JOIN (
    VALUES ('CSSH'), ('HPL'), ('PGBA Ground')
) AS l("name")
WHERE NOT EXISTS (
    SELECT 1 FROM "locations" loc 
    WHERE loc."organization_id" = o."id" 
      AND LOWER(TRIM(loc."name")) = LOWER(TRIM(l."name"))
);

-- 6. Ensure has_kb_edit_access exists on profiles table
ALTER TABLE "profiles"
    ADD COLUMN IF NOT EXISTS "has_kb_edit_access" BOOLEAN DEFAULT false;

-- 7. Ensure audit_logs.entity_id supports dynamic text IDs
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audit_logs' AND column_name = 'entity_id' AND data_type != 'text'
    ) THEN
        ALTER TABLE "audit_logs" ALTER COLUMN "entity_id" TYPE TEXT;
    END IF;
END $$;

-- 8. Ensure knowledge_base_articles and revisions structure is intact
CREATE TABLE IF NOT EXISTS "knowledge_base_articles" (
    "id" TEXT NOT NULL,
    "organization_id" UUID,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "module_href" TEXT,
    "tags" JSONB DEFAULT '[]'::jsonb,
    "sort_order" INTEGER DEFAULT 0,
    "section_number" TEXT,
    "parent_id" TEXT,
    "is_published" BOOLEAN DEFAULT false,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_base_articles_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "knowledge_base_articles"
    ADD COLUMN IF NOT EXISTS "section_number" TEXT,
    ADD COLUMN IF NOT EXISTS "parent_id" TEXT;

CREATE TABLE IF NOT EXISTS "knowledge_base_revisions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "article_id" TEXT NOT NULL,
    "organization_id" UUID,
    "edited_by" UUID,
    "editor_name" TEXT,
    "editor_role" TEXT,
    "previous_content" TEXT,
    "new_content" TEXT,
    "change_summary" TEXT,
    "is_published_state" BOOLEAN,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_base_revisions_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'knowledge_base_articles_organization_id_fkey') THEN
        ALTER TABLE "knowledge_base_articles"
            ADD CONSTRAINT "knowledge_base_articles_organization_id_fkey"
            FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'knowledge_base_articles_created_by_fkey') THEN
        ALTER TABLE "knowledge_base_articles"
            ADD CONSTRAINT "knowledge_base_articles_created_by_fkey"
            FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'knowledge_base_articles_updated_by_fkey') THEN
        ALTER TABLE "knowledge_base_articles"
            ADD CONSTRAINT "knowledge_base_articles_updated_by_fkey"
            FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'knowledge_base_revisions_article_id_fkey') THEN
        ALTER TABLE "knowledge_base_revisions"
            ADD CONSTRAINT "knowledge_base_revisions_article_id_fkey"
            FOREIGN KEY ("article_id") REFERENCES "knowledge_base_articles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'knowledge_base_revisions_organization_id_fkey') THEN
        ALTER TABLE "knowledge_base_revisions"
            ADD CONSTRAINT "knowledge_base_revisions_organization_id_fkey"
            FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'knowledge_base_revisions_edited_by_fkey') THEN
        ALTER TABLE "knowledge_base_revisions"
            ADD CONSTRAINT "knowledge_base_revisions_edited_by_fkey"
            FOREIGN KEY ("edited_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_kb_articles_cat" ON "knowledge_base_articles"("category", "sort_order");
CREATE INDEX IF NOT EXISTS "idx_kb_articles_section" ON "knowledge_base_articles"("section_number");
CREATE INDEX IF NOT EXISTS "idx_kb_articles_org" ON "knowledge_base_articles"("organization_id");
CREATE INDEX IF NOT EXISTS "idx_kb_revisions_art" ON "knowledge_base_revisions"("article_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_kb_revisions_org" ON "knowledge_base_revisions"("organization_id");

