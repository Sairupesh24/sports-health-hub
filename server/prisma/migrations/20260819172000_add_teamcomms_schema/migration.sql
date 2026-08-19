-- =============================================================
-- Migration: 20260819172000_add_teamcomms_schema
-- Description: Adds all TeamComms Messenger schema tables,
--              indexes, foreign keys, triggers, and default data.
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. USER ORGANIZATIONS (multi-org membership)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "user_organizations" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"         UUID NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "role"            TEXT NOT NULL DEFAULT 'member',
  "joined_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "invited_by"      UUID REFERENCES "profiles"("id") ON DELETE SET NULL,
  CONSTRAINT "user_organizations_user_id_organization_id_key" UNIQUE ("user_id", "organization_id")
);

CREATE INDEX IF NOT EXISTS "idx_user_organizations_user" ON "user_organizations"("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_organizations_org"  ON "user_organizations"("organization_id");

-- ─────────────────────────────────────────────────────────────
-- 2. CHAT BOTS (HubBot identity per org)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "chat_bots" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "name"            TEXT NOT NULL DEFAULT 'HubBot',
  "avatar_url"      TEXT,
  "description"     TEXT,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "chat_bots_organization_id_name_key" UNIQUE ("organization_id", "name")
);

CREATE INDEX IF NOT EXISTS "idx_chat_bots_org" ON "chat_bots"("organization_id");

-- ─────────────────────────────────────────────────────────────
-- 3. CHAT CHANNELS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "chat_channels" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "name"            TEXT NOT NULL,
  "description"     TEXT,
  "channel_type"    TEXT NOT NULL DEFAULT 'public',
  "created_by"      UUID REFERENCES "profiles"("id") ON DELETE SET NULL,
  "is_archived"     BOOLEAN NOT NULL DEFAULT FALSE,
  "is_default"      BOOLEAN NOT NULL DEFAULT FALSE,
  "last_message_at" TIMESTAMPTZ,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deleted_at"      TIMESTAMPTZ,
  CONSTRAINT "chat_channels_organization_id_name_key" UNIQUE ("organization_id", "name")
);

CREATE INDEX IF NOT EXISTS "idx_chat_channels_org"    ON "chat_channels"("organization_id");
CREATE INDEX IF NOT EXISTS "idx_chat_channels_type"   ON "chat_channels"("channel_type");
CREATE INDEX IF NOT EXISTS "idx_chat_channels_active" ON "chat_channels"("organization_id") WHERE "deleted_at" IS NULL AND "is_archived" = FALSE;

-- ─────────────────────────────────────────────────────────────
-- 4. CHANNEL MEMBERS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "channel_members" (
  "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "channel_id"   UUID NOT NULL REFERENCES "chat_channels"("id") ON DELETE CASCADE,
  "user_id"      UUID NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "role"         TEXT NOT NULL DEFAULT 'member',
  "muted"        BOOLEAN NOT NULL DEFAULT FALSE,
  "joined_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "last_read_at" TIMESTAMPTZ,
  CONSTRAINT "channel_members_channel_id_user_id_key" UNIQUE ("channel_id", "user_id")
);

CREATE INDEX IF NOT EXISTS "idx_channel_members_channel" ON "channel_members"("channel_id");
CREATE INDEX IF NOT EXISTS "idx_channel_members_user"    ON "channel_members"("user_id");

-- ─────────────────────────────────────────────────────────────
-- 5. DIRECT MESSAGE THREADS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "direct_message_threads" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "user_a"          UUID NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "user_b"          UUID NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "last_message_at" TIMESTAMPTZ,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "direct_message_threads_organization_id_user_a_user_b_key" UNIQUE ("organization_id", "user_a", "user_b")
);

CREATE INDEX IF NOT EXISTS "idx_dm_threads_user_a" ON "direct_message_threads"("user_a");
CREATE INDEX IF NOT EXISTS "idx_dm_threads_user_b" ON "direct_message_threads"("user_b");
CREATE INDEX IF NOT EXISTS "idx_dm_threads_org"    ON "direct_message_threads"("organization_id");

-- ─────────────────────────────────────────────────────────────
-- 6. CHAT MESSAGES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "chat_messages" (
  "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id"   UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "channel_id"        UUID REFERENCES "chat_channels"("id") ON DELETE CASCADE,
  "dm_thread_id"      UUID REFERENCES "direct_message_threads"("id") ON DELETE CASCADE,
  "user_id"           UUID REFERENCES "profiles"("id") ON DELETE SET NULL,
  "bot_id"            UUID REFERENCES "chat_bots"("id") ON DELETE SET NULL,
  "parent_message_id" UUID REFERENCES "chat_messages"("id") ON DELETE CASCADE,
  "message_type"      TEXT NOT NULL DEFAULT 'user',
  "content"           TEXT,
  "content_html"      TEXT,
  "metadata"          JSONB,
  "is_edited"         BOOLEAN NOT NULL DEFAULT FALSE,
  "edited_at"         TIMESTAMPTZ,
  "created_at"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deleted_at"        TIMESTAMPTZ,
  CONSTRAINT "chk_chat_messages_sender" CHECK ("user_id" IS NOT NULL OR "bot_id" IS NOT NULL),
  CONSTRAINT "chk_chat_messages_destination" CHECK ("channel_id" IS NOT NULL OR "dm_thread_id" IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS "idx_chat_messages_channel" ON "chat_messages"("channel_id", "created_at" DESC) WHERE "deleted_at" IS NULL;
CREATE INDEX IF NOT EXISTS "idx_chat_messages_dm"      ON "chat_messages"("dm_thread_id", "created_at" DESC) WHERE "deleted_at" IS NULL;
CREATE INDEX IF NOT EXISTS "idx_chat_messages_thread"  ON "chat_messages"("parent_message_id") WHERE "parent_message_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_chat_messages_org"     ON "chat_messages"("organization_id", "created_at" DESC);

-- Full-text search index
CREATE INDEX IF NOT EXISTS "idx_chat_messages_fts"     ON "chat_messages" USING gin(to_tsvector('english', coalesce("content", '')));

-- ─────────────────────────────────────────────────────────────
-- 7. MESSAGE ATTACHMENTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "message_attachments" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "message_id"  UUID NOT NULL REFERENCES "chat_messages"("id") ON DELETE CASCADE,
  "file_name"   TEXT NOT NULL,
  "file_url"    TEXT NOT NULL,
  "file_size"   BIGINT,
  "mime_type"   TEXT,
  "uploaded_by" UUID REFERENCES "profiles"("id") ON DELETE SET NULL,
  "uploaded_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_attachments_message" ON "message_attachments"("message_id");

-- ─────────────────────────────────────────────────────────────
-- 8. MESSAGE REACTIONS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "message_reactions" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "message_id" UUID NOT NULL REFERENCES "chat_messages"("id") ON DELETE CASCADE,
  "user_id"    UUID NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "emoji"      TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "message_reactions_message_id_user_id_emoji_key" UNIQUE ("message_id", "user_id", "emoji")
);

CREATE INDEX IF NOT EXISTS "idx_reactions_message" ON "message_reactions"("message_id");

-- ─────────────────────────────────────────────────────────────
-- 9. MESSAGE READS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "message_reads" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "message_id" UUID NOT NULL REFERENCES "chat_messages"("id") ON DELETE CASCADE,
  "user_id"    UUID NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "read_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "message_reads_message_id_user_id_key" UNIQUE ("message_id", "user_id")
);

CREATE INDEX IF NOT EXISTS "idx_reads_user"    ON "message_reads"("user_id");
CREATE INDEX IF NOT EXISTS "idx_reads_message" ON "message_reads"("message_id");

-- ─────────────────────────────────────────────────────────────
-- 10. TEAMCOMMS SETTINGS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "teamcomms_settings" (
  "id"                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id"          UUID NOT NULL UNIQUE REFERENCES "organizations"("id") ON DELETE CASCADE,
  "is_enabled"               BOOLEAN NOT NULL DEFAULT TRUE,
  "notify_task_assigned"     BOOLEAN NOT NULL DEFAULT TRUE,
  "notify_task_overdue"      BOOLEAN NOT NULL DEFAULT TRUE,
  "notify_appointment"       BOOLEAN NOT NULL DEFAULT TRUE,
  "notify_leave"             BOOLEAN NOT NULL DEFAULT TRUE,
  "notify_clinical_report"   BOOLEAN NOT NULL DEFAULT TRUE,
  "notify_meal_plan"         BOOLEAN NOT NULL DEFAULT TRUE,
  "notify_membership_expiry" BOOLEAN NOT NULL DEFAULT TRUE,
  "report_channel_id"        UUID REFERENCES "chat_channels"("id") ON DELETE SET NULL,
  "created_at"               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 11. SCHEDULED REPORTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "teamcomms_scheduled_reports" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "channel_id"      UUID NOT NULL REFERENCES "chat_channels"("id") ON DELETE CASCADE,
  "report_type"     TEXT NOT NULL,
  "cron_expression" TEXT NOT NULL,
  "is_active"       BOOLEAN NOT NULL DEFAULT TRUE,
  "last_run_at"     TIMESTAMPTZ,
  "created_by"      UUID REFERENCES "profiles"("id") ON DELETE SET NULL,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_scheduled_reports_org"    ON "teamcomms_scheduled_reports"("organization_id");
CREATE INDEX IF NOT EXISTS "idx_scheduled_reports_active" ON "teamcomms_scheduled_reports"("is_active") WHERE "is_active" = TRUE;

-- ─────────────────────────────────────────────────────────────
-- 12. DEFAULT DATA SEEDING (Seed channels and HubBot for orgs)
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  org RECORD;
  gen_ch_id UUID;
  ann_ch_id UUID;
  bot_id UUID;
  prof RECORD;
BEGIN
  FOR org IN SELECT id FROM organizations LOOP
    -- 1. HubBot
    INSERT INTO chat_bots (organization_id, name, description)
    VALUES (org.id, 'HubBot', 'Sports Health Hub Automated Notification Assistant')
    ON CONFLICT (organization_id, name) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO bot_id;

    -- 2. General channel
    INSERT INTO chat_channels (organization_id, name, description, channel_type, is_default)
    VALUES (org.id, 'general', 'General team discussions and updates', 'public', TRUE)
    ON CONFLICT (organization_id, name) DO UPDATE SET is_default = TRUE
    RETURNING id INTO gen_ch_id;

    -- 3. Announcements channel
    INSERT INTO chat_channels (organization_id, name, description, channel_type, is_default)
    VALUES (org.id, 'announcements', 'Official organization announcements and broadcasts', 'announcement', TRUE)
    ON CONFLICT (organization_id, name) DO UPDATE SET is_default = TRUE
    RETURNING id INTO ann_ch_id;

    -- 4. Settings
    INSERT INTO teamcomms_settings (organization_id, report_channel_id)
    VALUES (org.id, gen_ch_id)
    ON CONFLICT (organization_id) DO NOTHING;

    -- 5. Auto-join existing org members to default channels
    FOR prof IN SELECT id FROM profiles WHERE organization_id = org.id LOOP
      INSERT INTO channel_members (channel_id, user_id, role)
      VALUES (gen_ch_id, prof.id, 'member')
      ON CONFLICT (channel_id, user_id) DO NOTHING;

      INSERT INTO channel_members (channel_id, user_id, role)
      VALUES (ann_ch_id, prof.id, 'member')
      ON CONFLICT (channel_id, user_id) DO NOTHING;

      INSERT INTO user_organizations (user_id, organization_id, role)
      VALUES (prof.id, org.id, 'member')
      ON CONFLICT (user_id, organization_id) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$;
