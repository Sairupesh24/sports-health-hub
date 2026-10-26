-- =============================================================
-- Migration: 20261026143000_add_knowledge_base_and_kb_edit_access
-- Description:
--   1. Adds has_kb_edit_access column to profiles table for granular
--      Knowledge Base editor authorization.
--   2. Creates knowledge_base_articles table supporting hierarchical
--      folder structuring (section_number, parent_id), publishing states,
--      rich content, direct module links, and author tracking.
--   3. Creates knowledge_base_revisions table for audit diffs and version history.
--   4. Adds foreign keys, indexes, and ensures audit_logs accepts dynamic entity IDs.
-- =============================================================

-- 1. Ensure has_kb_edit_access exists on profiles table
ALTER TABLE "profiles"
    ADD COLUMN IF NOT EXISTS "has_kb_edit_access" BOOLEAN DEFAULT false;

-- 2. Create knowledge_base_articles table
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

-- Ensure section_number and parent_id columns exist if table was previously created
ALTER TABLE "knowledge_base_articles"
    ADD COLUMN IF NOT EXISTS "section_number" TEXT,
    ADD COLUMN IF NOT EXISTS "parent_id" TEXT;

-- 3. Create knowledge_base_revisions table
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

-- 4. Foreign Key Constraints
DO $$
BEGIN
    -- knowledge_base_articles -> organizations
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'knowledge_base_articles_organization_id_fkey') THEN
        ALTER TABLE "knowledge_base_articles"
            ADD CONSTRAINT "knowledge_base_articles_organization_id_fkey"
            FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;

    -- knowledge_base_articles -> users (created_by)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'knowledge_base_articles_created_by_fkey') THEN
        ALTER TABLE "knowledge_base_articles"
            ADD CONSTRAINT "knowledge_base_articles_created_by_fkey"
            FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    END IF;

    -- knowledge_base_articles -> users (updated_by)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'knowledge_base_articles_updated_by_fkey') THEN
        ALTER TABLE "knowledge_base_articles"
            ADD CONSTRAINT "knowledge_base_articles_updated_by_fkey"
            FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    END IF;

    -- knowledge_base_revisions -> knowledge_base_articles
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'knowledge_base_revisions_article_id_fkey') THEN
        ALTER TABLE "knowledge_base_revisions"
            ADD CONSTRAINT "knowledge_base_revisions_article_id_fkey"
            FOREIGN KEY ("article_id") REFERENCES "knowledge_base_articles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;

    -- knowledge_base_revisions -> organizations
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'knowledge_base_revisions_organization_id_fkey') THEN
        ALTER TABLE "knowledge_base_revisions"
            ADD CONSTRAINT "knowledge_base_revisions_organization_id_fkey"
            FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;

    -- knowledge_base_revisions -> users (edited_by)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'knowledge_base_revisions_edited_by_fkey') THEN
        ALTER TABLE "knowledge_base_revisions"
            ADD CONSTRAINT "knowledge_base_revisions_edited_by_fkey"
            FOREIGN KEY ("edited_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    END IF;
END $$;

-- 5. Performance and Hierarchical Query Indexes
CREATE INDEX IF NOT EXISTS "idx_kb_articles_cat" ON "knowledge_base_articles"("category", "sort_order");
CREATE INDEX IF NOT EXISTS "idx_kb_articles_section" ON "knowledge_base_articles"("section_number");
CREATE INDEX IF NOT EXISTS "idx_kb_articles_org" ON "knowledge_base_articles"("organization_id");
CREATE INDEX IF NOT EXISTS "idx_kb_revisions_art" ON "knowledge_base_revisions"("article_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_kb_revisions_org" ON "knowledge_base_revisions"("organization_id");

-- 6. Ensure audit_logs.entity_id supports dynamic text IDs
ALTER TABLE "audit_logs" ALTER COLUMN "entity_id" TYPE TEXT;
