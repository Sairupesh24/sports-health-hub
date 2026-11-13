-- =============================================================
-- Migration: 20261113133000_add_crm_leads_and_enquiry_form_config
-- Description:
--   1. Adds enquiry_form_config JSONB column and ensures slug column exists on organizations.
--   2. Adds index on organizations(slug) and backfills default clinic slugs.
--   3. Adds has_leads_access column to profiles table for Leads & CRM console authorization.
--   4. Adds lead_temperature column to enquiries table with default 'warm'.
--   5. Adds follow_up_note, disposition, and metadata columns to enquiryinteractions table.
--   6. Adds performance and search indexes on enquiries and enquiryinteractions.
-- =============================================================

-- 1. Organizations: Add enquiry_form_config and ensure slug exists
ALTER TABLE "organizations"
    ADD COLUMN IF NOT EXISTS "enquiry_form_config" JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS "slug" TEXT;

-- 2. Organizations: Index on slug and slug backfilling
CREATE INDEX IF NOT EXISTS "idx_organizations_slug" ON "organizations"("slug");

UPDATE "organizations" 
SET "slug" = 'cssh' 
WHERE ("slug" IS NULL OR "slug" = '') AND ("name" ILIKE '%spine%' OR "org_code" = '449158');

UPDATE "organizations" 
SET "slug" = 'main-clinic' 
WHERE ("slug" IS NULL OR "slug" = '') AND ("name" ILIKE '%main%' OR "org_code" = '123456');

UPDATE "organizations" 
SET "slug" = LOWER(REGEXP_REPLACE("name", '[^a-zA-Z0-9]+', '-', 'g'))
WHERE "slug" IS NULL OR "slug" = '';

-- 3. Profiles: Add has_leads_access for Leads & CRM console permission
ALTER TABLE "profiles"
    ADD COLUMN IF NOT EXISTS "has_leads_access" BOOLEAN DEFAULT false;

-- 4. Enquiries: Add lead_temperature and CRM indexes
ALTER TABLE "enquiries"
    ADD COLUMN IF NOT EXISTS "lead_temperature" TEXT DEFAULT 'warm';

CREATE INDEX IF NOT EXISTS "idx_enquiries_org_status" ON "enquiries"("organization_id", "status");
CREATE INDEX IF NOT EXISTS "idx_enquiries_org_follow_up" ON "enquiries"("organization_id", "next_follow_up_at");
CREATE INDEX IF NOT EXISTS "idx_enquiries_last_interaction" ON "enquiries"("last_interaction_at" DESC);

-- 5. EnquiryInteractions: Add CRM interaction touchpoint columns and indexes
ALTER TABLE "enquiryinteractions"
    ADD COLUMN IF NOT EXISTS "follow_up_note" TEXT,
    ADD COLUMN IF NOT EXISTS "disposition" TEXT,
    ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS "idx_enquiryinteractions_enquiry_created" ON "enquiryinteractions"("enquiry_id", "created_at" ASC);

