-- =============================================================
-- Migration: 20261118112000_sync_latest_schema
-- Description:
--   1. Reconciles knowledge_base_revisions.article_id NOT NULL constraint
--      on databases where the table pre-existed with a nullable article_id.
--   2. Reconciles CRM enquiry index naming (replaces legacy idx_enquiries_org_follow_up
--      with idx_enquiries_org_next_follow_up) and ensures all enquiry and
--      enquiryinteractions indexes exist.
--   3. Ensures locations, organizations, and sessions composite/lookup indexes exist.
--   4. Idempotently guarantees latest CRM, Knowledge Base, and Organization columns exist.
-- =============================================================

-- 1. Knowledge Base Revisions: Enforce NOT NULL on article_id safely
DELETE FROM "knowledge_base_revisions"
WHERE "article_id" IS NULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'knowledge_base_revisions'
          AND column_name = 'article_id'
          AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE "knowledge_base_revisions"
            ALTER COLUMN "article_id" SET NOT NULL;
    END IF;
END $$;

-- 2. Organizations: Ensure enquiry_form_config, slug, and slug index exist
ALTER TABLE "organizations"
    ADD COLUMN IF NOT EXISTS "enquiry_form_config" JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS "slug" TEXT;

CREATE INDEX IF NOT EXISTS "idx_organizations_slug" ON "organizations"("slug");

-- 3. Profiles: Ensure KB editor and Leads CRM access flags exist
ALTER TABLE "profiles"
    ADD COLUMN IF NOT EXISTS "has_kb_edit_access" BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS "has_leads_access" BOOLEAN DEFAULT false;

-- 4. Enquiries: Ensure lead_temperature column and reconcile indexes with Prisma schema
ALTER TABLE "enquiries"
    ADD COLUMN IF NOT EXISTS "lead_temperature" TEXT DEFAULT 'warm';

DROP INDEX IF EXISTS "idx_enquiries_org_follow_up";

CREATE INDEX IF NOT EXISTS "idx_enquiries_org_status" ON "enquiries"("organization_id", "status");
CREATE INDEX IF NOT EXISTS "idx_enquiries_org_next_follow_up" ON "enquiries"("organization_id", "next_follow_up_at");
CREATE INDEX IF NOT EXISTS "idx_enquiries_last_interaction" ON "enquiries"("last_interaction_at" DESC);

-- 5. EnquiryInteractions: Ensure CRM columns and timeline index exist
ALTER TABLE "enquiryinteractions"
    ADD COLUMN IF NOT EXISTS "follow_up_note" TEXT,
    ADD COLUMN IF NOT EXISTS "disposition" TEXT,
    ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS "idx_enquiryinteractions_enquiry_created" ON "enquiryinteractions"("enquiry_id", "created_at" ASC);

-- 6. Locations & Sessions: Ensure lookup indexes exist
CREATE INDEX IF NOT EXISTS "idx_locations_org_name" ON "locations"("organization_id", "name");
CREATE INDEX IF NOT EXISTS "idx_sessions_session_location" ON "sessions"("session_location");
CREATE INDEX IF NOT EXISTS "idx_sessions_org_session_location" ON "sessions"("organization_id", "session_location");
