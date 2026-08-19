-- =============================================================
-- TeamComms Migration
-- Sports Health Hub — Integrated Team Messenger
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. USER ORGANIZATIONS (multi-org membership)
--    Allows one ISHPO user to belong to multiple organizations.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_organizations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'member',  -- member | admin
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invited_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  UNIQUE(user_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_user_organizations_user   ON user_organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_org    ON user_organizations(organization_id);

-- ─────────────────────────────────────────────────────────────
-- 2. CHAT BOTS (HubBot identity per org)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_bots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL DEFAULT 'HubBot',
  avatar_url      TEXT,
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_chat_bots_org ON chat_bots(organization_id);

-- ─────────────────────────────────────────────────────────────
-- 3. CHAT CHANNELS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_channels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,             -- e.g. "general", "hr-reports"
  description     TEXT,
  channel_type    TEXT NOT NULL DEFAULT 'public',
    -- public | private | announcement | automated | dm
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_archived     BOOLEAN NOT NULL DEFAULT FALSE,
  is_default      BOOLEAN NOT NULL DEFAULT FALSE,  -- auto-joined by new members
  last_message_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  UNIQUE(organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_chat_channels_org      ON chat_channels(organization_id);
CREATE INDEX IF NOT EXISTS idx_chat_channels_type     ON chat_channels(channel_type);
CREATE INDEX IF NOT EXISTS idx_chat_channels_active   ON chat_channels(organization_id) WHERE deleted_at IS NULL AND is_archived = FALSE;

-- ─────────────────────────────────────────────────────────────
-- 4. CHANNEL MEMBERS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS channel_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id  UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member',  -- owner | member
  muted       BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  UNIQUE(channel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_members_channel ON channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_user    ON channel_members(user_id);

-- ─────────────────────────────────────────────────────────────
-- 5. DIRECT MESSAGE THREADS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS direct_message_threads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_a          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_b          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, user_a, user_b)
);

CREATE INDEX IF NOT EXISTS idx_dm_threads_user_a ON direct_message_threads(user_a);
CREATE INDEX IF NOT EXISTS idx_dm_threads_user_b ON direct_message_threads(user_b);
CREATE INDEX IF NOT EXISTS idx_dm_threads_org    ON direct_message_threads(organization_id);

-- ─────────────────────────────────────────────────────────────
-- 6. CHAT MESSAGES (channels + DMs + threads)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Exactly one of these is set (channel OR dm_thread)
  channel_id       UUID REFERENCES chat_channels(id) ON DELETE CASCADE,
  dm_thread_id     UUID REFERENCES direct_message_threads(id) ON DELETE CASCADE,

  -- Sender: one of user_id or bot_id is set
  user_id          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  bot_id           UUID REFERENCES chat_bots(id) ON DELETE SET NULL,

  -- Threading: if set, this is a reply to parent_message_id
  parent_message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,

  message_type     TEXT NOT NULL DEFAULT 'user',
    -- user | system | automated_task | automated_appointment |
    -- automated_report | automated_leave | automated_clinical |
    -- automated_membership | automated_nutrition

  content          TEXT,                    -- markdown-aware plain text
  content_html     TEXT,                    -- TipTap HTML output

  -- Rich metadata for automated messages (JSONB)
  metadata         JSONB,
    -- e.g. { "task_id": "...", "task_title": "...", "module": "planner", "action_url": "/planner/..." }

  is_edited        BOOLEAN NOT NULL DEFAULT FALSE,
  edited_at        TIMESTAMPTZ,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,

  CONSTRAINT chk_sender        CHECK (user_id IS NOT NULL OR bot_id IS NOT NULL),
  CONSTRAINT chk_destination   CHECK (channel_id IS NOT NULL OR dm_thread_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_channel   ON chat_messages(channel_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_chat_messages_dm        ON chat_messages(dm_thread_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread    ON chat_messages(parent_message_id) WHERE parent_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_messages_org       ON chat_messages(organization_id, created_at DESC);
-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_chat_messages_fts ON chat_messages USING gin(to_tsvector('english', coalesce(content, '')));

-- ─────────────────────────────────────────────────────────────
-- 7. MESSAGE ATTACHMENTS (file sharing)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_attachments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id  UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  file_name   TEXT NOT NULL,
  file_url    TEXT NOT NULL,
  file_size   BIGINT,           -- bytes
  mime_type   TEXT,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attachments_message ON message_attachments(message_id);

-- ─────────────────────────────────────────────────────────────
-- 8. MESSAGE REACTIONS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_reactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji      TEXT NOT NULL,            -- e.g. "👍", "❤️", "🎉"
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_reactions_message ON message_reactions(message_id);

-- ─────────────────────────────────────────────────────────────
-- 9. MESSAGE READS (read receipts / unread tracking)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_reads (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reads_user    ON message_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_reads_message ON message_reads(message_id);

-- ─────────────────────────────────────────────────────────────
-- 10. TEAMCOMMS SETTINGS (per organization)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teamcomms_settings (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id             UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  is_enabled                  BOOLEAN NOT NULL DEFAULT TRUE,
  notify_task_assigned        BOOLEAN NOT NULL DEFAULT TRUE,
  notify_task_overdue         BOOLEAN NOT NULL DEFAULT TRUE,
  notify_appointment          BOOLEAN NOT NULL DEFAULT TRUE,
  notify_leave                BOOLEAN NOT NULL DEFAULT TRUE,
  notify_clinical_report      BOOLEAN NOT NULL DEFAULT TRUE,
  notify_meal_plan            BOOLEAN NOT NULL DEFAULT TRUE,
  notify_membership_expiry    BOOLEAN NOT NULL DEFAULT TRUE,
  report_channel_id           UUID REFERENCES chat_channels(id) ON DELETE SET NULL,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 11. SCHEDULED REPORTS CONFIGURATION
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teamcomms_scheduled_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  channel_id      UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  report_type     TEXT NOT NULL,
    -- attendance_summary | appointments_today | billing_summary |
    -- expiring_memberships | clinical_report_count | weekly_performance
  cron_expression TEXT NOT NULL,   -- e.g. "0 9 * * 1" for Mon 9am
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_run_at     TIMESTAMPTZ,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_reports_org ON teamcomms_scheduled_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_active ON teamcomms_scheduled_reports(is_active) WHERE is_active = TRUE;

-- ─────────────────────────────────────────────────────────────
-- 12. TRIGGERS — auto-update updated_at
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_chat_channels_updated_at') THEN
    CREATE TRIGGER update_chat_channels_updated_at
      BEFORE UPDATE ON chat_channels
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_chat_messages_updated_at') THEN
    CREATE TRIGGER update_chat_messages_updated_at
      BEFORE UPDATE ON chat_messages
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_teamcomms_settings_updated_at') THEN
    CREATE TRIGGER update_teamcomms_settings_updated_at
      BEFORE UPDATE ON teamcomms_settings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 13. TRIGGER — notify on new message (for real-time bridge)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_new_chat_message()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'teamcomms_new_message',
    json_build_object(
      'message_id',     NEW.id,
      'organization_id', NEW.organization_id,
      'channel_id',     NEW.channel_id,
      'dm_thread_id',   NEW.dm_thread_id,
      'user_id',        NEW.user_id,
      'bot_id',         NEW.bot_id,
      'message_type',   NEW.message_type,
      'created_at',     NEW.created_at
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notify_new_chat_message') THEN
    CREATE TRIGGER trg_notify_new_chat_message
      AFTER INSERT ON chat_messages
      FOR EACH ROW EXECUTE FUNCTION notify_new_chat_message();
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 14. TRIGGER — update channel last_message_at
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_channel_last_message_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.channel_id IS NOT NULL THEN
    UPDATE chat_channels SET last_message_at = NEW.created_at WHERE id = NEW.channel_id;
  END IF;
  IF NEW.dm_thread_id IS NOT NULL THEN
    UPDATE direct_message_threads SET last_message_at = NEW.created_at WHERE id = NEW.dm_thread_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_last_message_at') THEN
    CREATE TRIGGER trg_update_last_message_at
      AFTER INSERT ON chat_messages
      FOR EACH ROW EXECUTE FUNCTION update_channel_last_message_at();
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 15. BACKFILL: seed existing organizations into user_organizations
--     (ensures existing Hub users are in their org's TeamComms)
-- ─────────────────────────────────────────────────────────────
INSERT INTO user_organizations (user_id, organization_id, role)
SELECT p.id, p.organization_id, 'member'
FROM profiles p
WHERE p.organization_id IS NOT NULL
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 16. BACKFILL: create HubBot for each existing organization
-- ─────────────────────────────────────────────────────────────
INSERT INTO chat_bots (organization_id, name, description)
SELECT id, 'HubBot', 'Automated system notifications from Sports Health Hub'
FROM organizations
ON CONFLICT (organization_id, name) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 17. BACKFILL: create default channels for each organization
-- ─────────────────────────────────────────────────────────────
INSERT INTO chat_channels (organization_id, name, description, channel_type, is_default)
SELECT id, 'general', 'Company-wide announcements and general conversation', 'public', TRUE
FROM organizations
ON CONFLICT (organization_id, name) DO NOTHING;

INSERT INTO chat_channels (organization_id, name, description, channel_type, is_default)
SELECT id, 'announcements', 'Important organization-wide announcements', 'announcement', TRUE
FROM organizations
ON CONFLICT (organization_id, name) DO NOTHING;

INSERT INTO chat_channels (organization_id, name, description, channel_type, is_default)
SELECT id, 'hub-notifications', 'Automated alerts from all Hub modules', 'automated', FALSE
FROM organizations
ON CONFLICT (organization_id, name) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 18. BACKFILL: default TeamComms settings for each org
-- ─────────────────────────────────────────────────────────────
INSERT INTO teamcomms_settings (organization_id)
SELECT id FROM organizations
ON CONFLICT (organization_id) DO NOTHING;

-- Done
SELECT 'TeamComms migration completed successfully' AS status;
