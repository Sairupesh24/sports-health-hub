import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db } from './db.js';
import { requireAuth } from './middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const messengerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'chat-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const messengerUpload = multer({
  storage: messengerStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

const router = express.Router();
router.use(requireAuth);

// ================================================================
// HELPER UTILITIES
// ================================================================

/** Resolve organization ID reliably from query, body, headers, JWT, profiles, user_organizations, or fallback */
async function resolveOrgId(req) {
  if (req.query?.org_id) return req.query.org_id;
  if (req.body?.org_id) return req.body.org_id;
  if (req.headers?.['x-organization-id']) return req.headers['x-organization-id'];
  if (req.user?.organization_id) return req.user.organization_id;

  const userId = req.user?.id;
  if (!userId) return null;

  try {
    const profRes = await db.query(`SELECT organization_id FROM profiles WHERE id = $1`, [userId]);
    if (profRes.rows[0]?.organization_id) return profRes.rows[0].organization_id;

    const uoRes = await db.query(`SELECT organization_id FROM user_organizations WHERE user_id = $1 ORDER BY joined_at ASC LIMIT 1`, [userId]);
    if (uoRes.rows[0]?.organization_id) return uoRes.rows[0].organization_id;

    const firstOrg = await db.query(`SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1`);
    return firstOrg.rows[0]?.id || null;
  } catch (err) {
    console.error('[Messenger] Error resolving orgId:', err);
    return null;
  }
}

/** Paginate cursor: ISO timestamp string or null */
const parseCursor = (cursor) => cursor ? new Date(cursor).toISOString() : null;

/** Fetch HubBot for an org */
async function getOrCreateHubBot(orgId) {
  const res = await db.query(
    `SELECT id FROM chat_bots WHERE organization_id = $1 AND name = 'HubBot' LIMIT 1`,
    [orgId]
  );
  if (res.rows.length > 0) return res.rows[0].id;
  const ins = await db.query(
    `INSERT INTO chat_bots (organization_id, name, description)
     VALUES ($1, 'HubBot', 'Automated system notifications from Sports Health Hub')
     RETURNING id`,
    [orgId]
  );
  return ins.rows[0].id;
}

/** Assert that the requesting user is a member of the given channel */
async function assertChannelMember(channelId, userId, res) {
  const mem = await db.query(
    `SELECT id FROM channel_members WHERE channel_id = $1 AND user_id = $2`,
    [channelId, userId]
  );
  if (mem.rows.length === 0) {
    res.status(403).json({ error: 'Not a member of this channel' });
    return false;
  }
  return true;
}

// ================================================================
// ORGANIZATION SWITCHER
// ================================================================

// GET /api/messenger/my-organizations
// List all organizations the current user belongs to (for org switcher)
router.get('/my-organizations', async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await db.query(
      `SELECT o.id, o.name, o.logo_url, uo.role, uo.joined_at
       FROM user_organizations uo
       JOIN organizations o ON o.id = uo.organization_id
       WHERE uo.user_id = $1
       ORDER BY uo.joined_at ASC`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Auto-populate from user's primary profile organization if missing
      const prof = await db.query(`SELECT organization_id FROM profiles WHERE id = $1`, [userId]);
      const orgId = prof.rows[0]?.organization_id;
      if (orgId) {
        await db.query(
          `INSERT INTO user_organizations (user_id, organization_id, role)
           VALUES ($1, $2, 'member')
           ON CONFLICT (user_id, organization_id) DO NOTHING`,
          [userId, orgId]
        );
        const refetch = await db.query(
          `SELECT o.id, o.name, o.logo_url, 'member' as role, NOW() as joined_at
           FROM organizations o WHERE o.id = $1`,
          [orgId]
        );
        return res.json({ organizations: refetch.rows });
      }
    }

    res.json({ organizations: result.rows });
  } catch (err) {
    console.error('[Messenger] Error fetching user orgs:', err);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

// ================================================================
// CHANNELS
// ================================================================

// GET /api/messenger/channels?org_id=
// List channels the user is a member of (or all public in org)
router.get('/channels', async (req, res) => {
  try {
    const userId = req.user.id;
    const orgId = await resolveOrgId(req);

    if (orgId) {
      // 1. Ensure default channels exist for this organization
      const existRes = await db.query(
        `SELECT COUNT(*)::int as cnt FROM chat_channels WHERE organization_id = $1 AND deleted_at IS NULL`,
        [orgId]
      );
      if (existRes.rows[0].cnt === 0) {
        await db.query(
          `INSERT INTO chat_channels (organization_id, name, description, channel_type, is_default)
           VALUES 
             ($1, 'general', 'Company-wide announcements and general discussion', 'public', TRUE),
             ($1, 'announcements', 'Official organization updates and notices', 'announcement', TRUE),
             ($1, 'hub-notifications', 'Automated alerts and notifications from all Hub modules', 'automated', TRUE)
           ON CONFLICT (organization_id, name) DO NOTHING`,
          [orgId]
        );
      }

      // 2. Ensure current user is enrolled in default/public channels
      await db.query(
        `INSERT INTO channel_members (channel_id, user_id, role)
         SELECT id, $2, 'member'
         FROM chat_channels
         WHERE (organization_id = $1 OR organization_id IS NULL) AND (is_default = TRUE OR channel_type = 'public') AND deleted_at IS NULL
         ON CONFLICT (channel_id, user_id) DO NOTHING`,
        [orgId, userId]
      );
    }

    const result = await db.query(
      `SELECT c.*,
              cm.role as member_role,
              cm.muted,
              cm.last_read_at,
              (
                SELECT COUNT(*)::int FROM chat_messages m
                WHERE m.channel_id = c.id
                  AND m.deleted_at IS NULL
                  AND m.created_at > COALESCE(cm.last_read_at, '1970-01-01')
              ) as unread_count,
              (
                SELECT json_build_object(
                  'id', lm.id,
                  'content', lm.content,
                  'created_at', lm.created_at,
                  'user_id', lm.user_id
                )
                FROM chat_messages lm
                WHERE lm.channel_id = c.id AND lm.deleted_at IS NULL
                ORDER BY lm.created_at DESC LIMIT 1
              ) as last_message
       FROM chat_channels c
       JOIN channel_members cm ON cm.channel_id = c.id AND cm.user_id = $2
       WHERE (c.organization_id = $1 OR $1 IS NULL)
         AND c.deleted_at IS NULL
         AND c.is_archived = FALSE
       ORDER BY COALESCE(c.last_message_at, c.created_at) DESC`,
      [orgId || null, userId]
    );
    res.json({ channels: result.rows });
  } catch (err) {
    console.error('[Messenger] Error fetching channels:', err);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

// POST /api/messenger/channels
// Create a new channel
router.post('/channels', async (req, res) => {
  try {
    const userId = req.user.id;
    const orgId = req.body.org_id || userOrgId(req);
    const { name, description, channel_type = 'public', member_ids = [] } = req.body;

    if (!name) return res.status(400).json({ error: 'Channel name is required' });

    const safeName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');

    const chanResult = await db.query(
      `INSERT INTO chat_channels (organization_id, name, description, channel_type, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [orgId, safeName, description || null, channel_type, userId]
    );
    const channel = chanResult.rows[0];

    // Add creator as owner
    await db.query(
      `INSERT INTO channel_members (channel_id, user_id, role) VALUES ($1, $2, 'owner')
       ON CONFLICT (channel_id, user_id) DO NOTHING`,
      [channel.id, userId]
    );

    // Add additional members
    for (const memberId of member_ids) {
      if (memberId !== userId) {
        await db.query(
          `INSERT INTO channel_members (channel_id, user_id, role) VALUES ($1, $2, 'member')
           ON CONFLICT (channel_id, user_id) DO NOTHING`,
          [channel.id, memberId]
        );
      }
    }

    // Post a system message
    const botId = await getOrCreateHubBot(orgId);
    await db.query(
      `INSERT INTO chat_messages (organization_id, channel_id, bot_id, message_type, content)
       VALUES ($1, $2, $3, 'system', $4)`,
      [orgId, channel.id, botId, `Channel #${safeName} was created.`]
    );

    res.status(201).json({ channel });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A channel with this name already exists' });
    }
    console.error('[Messenger] Error creating channel:', err);
    res.status(500).json({ error: 'Failed to create channel' });
  }
});

// PATCH /api/messenger/channels/:id
// Update channel name or description
router.patch('/channels/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { name, description } = req.body;

    if (!(await assertChannelMember(id, userId, res))) return;

    const result = await db.query(
      `UPDATE chat_channels
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           updated_at = NOW()
       WHERE id = $3 AND deleted_at IS NULL
       RETURNING *`,
      [name || null, description !== undefined ? description : null, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Channel not found' });
    res.json({ channel: result.rows[0] });
  } catch (err) {
    console.error('[Messenger] Error updating channel:', err);
    res.status(500).json({ error: 'Failed to update channel' });
  }
});

// POST /api/messenger/channels/:id/join
// Join a public channel
router.post('/channels/:id/join', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const chan = await db.query(
      `SELECT * FROM chat_channels WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    if (chan.rows.length === 0) return res.status(404).json({ error: 'Channel not found' });
    if (chan.rows[0].channel_type === 'private') {
      return res.status(403).json({ error: 'This channel is private' });
    }

    await db.query(
      `INSERT INTO channel_members (channel_id, user_id, role) VALUES ($1, $2, 'member')
       ON CONFLICT (channel_id, user_id) DO NOTHING`,
      [id, userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[Messenger] Error joining channel:', err);
    res.status(500).json({ error: 'Failed to join channel' });
  }
});

// POST /api/messenger/channels/:id/invite
// Invite members to a channel
router.post('/channels/:id/invite', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { user_ids = [] } = req.body;

    if (!(await assertChannelMember(id, userId, res))) return;

    for (const uid of user_ids) {
      await db.query(
        `INSERT INTO channel_members (channel_id, user_id, role) VALUES ($1, $2, 'member')
         ON CONFLICT (channel_id, user_id) DO NOTHING`,
        [id, uid]
      );
    }
    res.json({ success: true, added: user_ids.length });
  } catch (err) {
    console.error('[Messenger] Error inviting to channel:', err);
    res.status(500).json({ error: 'Failed to invite members' });
  }
});

// DELETE /api/messenger/channels/:id/members/:userId
// Remove a member from a channel
router.delete('/channels/:id/members/:memberId', async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const requestingUserId = req.user.id;

    // Only owner or self-leave
    const mem = await db.query(
      `SELECT role FROM channel_members WHERE channel_id = $1 AND user_id = $2`,
      [id, requestingUserId]
    );
    if (mem.rows.length === 0) return res.status(403).json({ error: 'Not a member' });
    if (memberId !== requestingUserId && mem.rows[0].role !== 'owner') {
      return res.status(403).json({ error: 'Only channel owner can remove members' });
    }

    await db.query(
      `DELETE FROM channel_members WHERE channel_id = $1 AND user_id = $2`,
      [id, memberId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[Messenger] Error removing member:', err);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// GET /api/messenger/channels/:id/members
// List members of a channel
router.get('/channels/:id/members', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    if (!(await assertChannelMember(id, userId, res))) return;

    const result = await db.query(
      `SELECT cm.user_id, cm.role as member_role, cm.muted, cm.joined_at,
              p.first_name, p.last_name, p.avatar_url, p.profession,
              COALESCE(p.profession, p.ams_role, u.role, 'Member') as role
       FROM channel_members cm
       JOIN profiles p ON p.id = cm.user_id
       LEFT JOIN users u ON u.id = p.id
       WHERE cm.channel_id = $1
       ORDER BY cm.role DESC, p.first_name ASC`,
      [id]
    );
    res.json({ members: result.rows });
  } catch (err) {
    console.error('[Messenger] Error fetching channel members:', err);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// ================================================================
// MESSAGES
// ================================================================

// GET /api/messenger/channels/:id/messages?before=<cursor>&limit=50
// Paginated message history (newest-first with cursor)
router.get('/channels/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    if (!(await assertChannelMember(id, userId, res))) return;

    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const before = parseCursor(req.query.before);

    const result = await db.query(
      `SELECT m.id, m.organization_id, m.channel_id, m.dm_thread_id, m.user_id, m.bot_id, m.parent_message_id,
              m.message_type, m.is_edited, m.edited_at, m.created_at, m.deleted_at,
              CASE WHEN m.deleted_at IS NOT NULL THEN TRUE ELSE FALSE END as is_deleted,
              CASE WHEN m.deleted_at IS NOT NULL THEN NULL ELSE m.content END as content,
              CASE WHEN m.deleted_at IS NOT NULL THEN NULL ELSE m.content_html END as content_html,
              p.first_name, p.last_name, p.avatar_url,
              COALESCE(p.profession, p.ams_role, u.role, 'Member') as role,
              cb.name as bot_name, cb.avatar_url as bot_avatar,
              (
                SELECT json_agg(json_build_object(
                  'emoji', r.emoji,
                  'count', r.cnt,
                  'users', r.users
                )) FROM (
                  SELECT emoji,
                         COUNT(*)::int as cnt,
                         json_agg(user_id) as users
                  FROM message_reactions
                  WHERE message_id = m.id
                  GROUP BY emoji
                ) r
              ) as reactions,
              (
                SELECT COUNT(*)::int FROM chat_messages t
                WHERE t.parent_message_id = m.id AND t.deleted_at IS NULL
              ) as reply_count,
              CASE WHEN m.deleted_at IS NOT NULL THEN NULL ELSE (
                SELECT json_agg(json_build_object(
                  'id', a.id,
                  'file_name', a.file_name,
                  'file_url', a.file_url,
                  'file_size', a.file_size,
                  'mime_type', a.mime_type
                )) FROM message_attachments a WHERE a.message_id = m.id
              ) END as attachments
       FROM chat_messages m
       LEFT JOIN profiles p ON p.id = m.user_id
       LEFT JOIN users u ON u.id = p.id
       LEFT JOIN chat_bots cb ON cb.id = m.bot_id
       WHERE m.channel_id = $1
         AND m.parent_message_id IS NULL
         AND ($2::timestamptz IS NULL OR m.created_at < $2)
       ORDER BY m.created_at DESC
       LIMIT $3`,
      [id, before, limit]
    );

    // Mark channel as read for this user
    await db.query(
      `UPDATE channel_members SET last_read_at = NOW()
       WHERE channel_id = $1 AND user_id = $2`,
      [id, userId]
    );

    res.json({ messages: result.rows.reverse(), has_more: result.rows.length === limit });
  } catch (err) {
    console.error('[Messenger] Error fetching messages:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/messenger/upload
// Upload files for messenger attachments (PDF, DOCX, XLSX, images, etc.)
router.post('/upload', messengerUpload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploaded = req.files.map((f) => ({
      file_name: f.originalname,
      file_url: `/uploads/${f.filename}`,
      file_size: f.size,
      mime_type: f.mimetype || 'application/octet-stream',
    }));

    res.json({ files: uploaded });
  } catch (err) {
    console.error('[Messenger] File upload error:', err);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// POST /api/messenger/channels/:id/messages
// Send a message to a channel (REST fallback; Socket.io is preferred)
router.post('/channels/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const orgId = await resolveOrgId(req);
    if (!(await assertChannelMember(id, userId, res))) return;

    const { content, content_html, parent_message_id, attachments } = req.body;
    if (!content && !content_html && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: 'Message content or attachment is required' });
    }

    const result = await db.query(
      `INSERT INTO chat_messages
         (organization_id, channel_id, user_id, message_type, content, content_html, parent_message_id)
       VALUES ($1, $2, $3, 'user', $4, $5, $6)
       RETURNING *`,
      [orgId, id, userId, content || '', content_html || null, parent_message_id || null]
    );

    const msgRow = result.rows[0];
    let savedAttachments = [];
    if (Array.isArray(attachments) && attachments.length > 0) {
      for (const att of attachments) {
        const attRes = await db.query(
          `INSERT INTO message_attachments (message_id, file_name, file_url, file_size, mime_type, uploaded_by)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, file_name, file_url, file_size, mime_type`,
          [msgRow.id, att.file_name || att.name, att.file_url || att.url, att.file_size || att.size || null, att.mime_type || att.mime || null, userId]
        );
        if (attRes.rows.length > 0) {
          savedAttachments.push(attRes.rows[0]);
        }
      }
    }

    // Update channel last_message_at
    await db.query(`UPDATE chat_channels SET last_message_at = NOW() WHERE id = $1`, [id]);

    const profile = await db.query(
      `SELECT p.first_name, p.last_name, p.avatar_url,
              COALESCE(p.profession, p.ams_role, u.role, 'Member') as role
       FROM profiles p
       LEFT JOIN users u ON u.id = p.id
       WHERE p.id = $1`, [userId]
    );
    const fullMsg = { ...msgRow, ...profile.rows[0], attachments: savedAttachments };

    const io = req.app.get('io');
    if (io) {
      if (orgId) io.to(`${orgId}:${id}`).emit('new_message', fullMsg);
      io.to(`channel:${id}`).emit('new_message', fullMsg);
    }

    res.status(201).json({ message: fullMsg });
  } catch (err) {
    console.error('[Messenger] Error sending message:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// PATCH /api/messenger/messages/:id
// Edit a message
router.patch('/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { content, content_html } = req.body;

    const result = await db.query(
      `UPDATE chat_messages
       SET content = $1, content_html = $2, is_edited = TRUE, edited_at = NOW(), updated_at = NOW()
       WHERE id = $3 AND user_id = $4 AND deleted_at IS NULL
       RETURNING *`,
      [content, content_html || null, id, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found or unauthorized' });
    }
    res.json({ message: result.rows[0] });
  } catch (err) {
    console.error('[Messenger] Error editing message:', err);
    res.status(500).json({ error: 'Failed to edit message' });
  }
});

// DELETE /api/messenger/messages/:id
// Soft-delete a message
router.delete('/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Allow deletion by the author or an admin
    const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
    const whereClause = isAdmin
      ? `WHERE id = $1 AND deleted_at IS NULL`
      : `WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`;
    const params = isAdmin ? [id] : [id, userId];

    const result = await db.query(
      `UPDATE chat_messages SET deleted_at = NOW() ${whereClause} RETURNING id, channel_id, dm_thread_id, user_id, deleted_at`,
      params
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found or unauthorized' });
    }
    res.json({ success: true, message: result.rows[0] });
  } catch (err) {
    console.error('[Messenger] Error deleting message:', err);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// GET /api/messenger/messages/:id/thread
// Get thread replies for a message
router.get('/messages/:id/thread', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT m.*,
              p.first_name, p.last_name, p.avatar_url,
              COALESCE(p.profession, p.ams_role, u.role, 'Member') as role,
              cb.name as bot_name, cb.avatar_url as bot_avatar,
              (
                SELECT json_agg(json_build_object(
                  'emoji', r.emoji,
                  'count', r.cnt,
                  'users', r.users
                )) FROM (
                  SELECT emoji,
                         COUNT(*)::int as cnt,
                         json_agg(user_id) as users
                  FROM message_reactions
                  WHERE message_id = m.id
                  GROUP BY emoji
                ) r
              ) as reactions,
              (
                SELECT json_agg(json_build_object(
                  'id', a.id, 'file_name', a.file_name,
                  'file_url', a.file_url, 'file_size', a.file_size, 'mime_type', a.mime_type
                )) FROM message_attachments a WHERE a.message_id = m.id
              ) as attachments
       FROM chat_messages m
       LEFT JOIN profiles p ON p.id = m.user_id
       LEFT JOIN users u ON u.id = p.id
       LEFT JOIN chat_bots cb ON cb.id = m.bot_id
       WHERE m.parent_message_id = $1 AND m.deleted_at IS NULL
       ORDER BY m.created_at ASC`,
      [id]
    );
    res.json({ replies: result.rows });
  } catch (err) {
    console.error('[Messenger] Error fetching thread:', err);
    res.status(500).json({ error: 'Failed to fetch thread' });
  }
});

// ================================================================
// REACTIONS
// ================================================================

// POST /api/messenger/messages/:id/react
// Toggle an emoji reaction (add if missing, remove if exists)
router.post('/messages/:id/react', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { emoji } = req.body;

    if (!emoji) return res.status(400).json({ error: 'Emoji is required' });

    // Toggle
    const existing = await db.query(
      `SELECT id FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3`,
      [id, userId, emoji]
    );

    if (existing.rows.length > 0) {
      await db.query(
        `DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3`,
        [id, userId, emoji]
      );
      res.json({ action: 'removed', emoji });
    } else {
      await db.query(
        `INSERT INTO message_reactions (message_id, user_id, emoji) VALUES ($1, $2, $3)`,
        [id, userId, emoji]
      );
      res.json({ action: 'added', emoji });
    }
  } catch (err) {
    console.error('[Messenger] Error toggling reaction:', err);
    res.status(500).json({ error: 'Failed to toggle reaction' });
  }
});

// ================================================================
// READ STATUS / UNREAD COUNTS
// ================================================================

// POST /api/messenger/messages/:id/read  (mark a specific message read)
router.post('/messages/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    await db.query(
      `INSERT INTO message_reads (message_id, user_id) VALUES ($1, $2)
       ON CONFLICT (message_id, user_id) DO NOTHING`,
      [id, userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[Messenger] Error marking read:', err);
    res.status(500).json({ error: 'Failed to mark read' });
  }
});

// POST /api/messenger/dms/:id/read (mark all messages in DM thread as read)
router.post('/dms/:id/read', async (req, res) => {
  try {
    const { id: dmThreadId } = req.params;
    const userId = req.user.id;
    await db.query(
      `INSERT INTO message_reads (message_id, user_id)
       SELECT m.id, $2
       FROM chat_messages m
       WHERE m.dm_thread_id = $1
         AND m.user_id != $2
         AND m.deleted_at IS NULL
       ON CONFLICT (message_id, user_id) DO NOTHING`,
      [dmThreadId, userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[Messenger] Error marking DM thread read:', err);
    res.status(500).json({ error: 'Failed to mark DM read' });
  }
});

// POST /api/messenger/channels/:id/read (mark channel as read)
router.post('/channels/:id/read', async (req, res) => {
  try {
    const { id: channelId } = req.params;
    const userId = req.user.id;
    await db.query(
      `UPDATE channel_members SET last_read_at = NOW() WHERE channel_id = $1 AND user_id = $2`,
      [channelId, userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[Messenger] Error marking channel read:', err);
    res.status(500).json({ error: 'Failed to mark channel read' });
  }
});

// GET /api/messenger/unread?org_id=
// Total unread counts per channel and DM thread for the current user
router.get('/unread', async (req, res) => {
  try {
    const userId = req.user.id;
    const orgId = await resolveOrgId(req);

    const chResult = await db.query(
      `SELECT c.id as channel_id, c.name,
              (
                SELECT COUNT(*)::int FROM chat_messages m
                WHERE m.channel_id = c.id
                  AND m.deleted_at IS NULL
                  AND m.created_at > COALESCE(cm.last_read_at, '1970-01-01')
              ) as unread_count
       FROM chat_channels c
       JOIN channel_members cm ON cm.channel_id = c.id AND cm.user_id = $2
       WHERE (c.organization_id = $1 OR $1 IS NULL) AND c.deleted_at IS NULL`,
      [orgId || null, userId]
    );

    const dmResult = await db.query(
      `SELECT dt.id as dm_thread_id,
              (
                SELECT COUNT(*)::int FROM chat_messages m
                LEFT JOIN message_reads mr ON mr.message_id = m.id AND mr.user_id = $1
                WHERE m.dm_thread_id = dt.id
                  AND m.deleted_at IS NULL
                  AND m.user_id != $1
                  AND mr.id IS NULL
              ) as unread_count
       FROM direct_message_threads dt
       WHERE (dt.user_a = $1 OR dt.user_b = $1)`,
      [userId]
    );

    const totalUnread =
      chResult.rows.reduce((sum, r) => sum + r.unread_count, 0) +
      dmResult.rows.reduce((sum, r) => sum + r.unread_count, 0);

    res.json({
      channels: chResult.rows,
      dms: dmResult.rows,
      total_unread: totalUnread,
    });
  } catch (err) {
    console.error('[Messenger] Error fetching unread counts:', err);
    res.status(500).json({ error: 'Failed to fetch unread counts' });
  }
});

// ================================================================
// DIRECT MESSAGES
// ================================================================

// GET /api/messenger/dms?org_id=
// List all DM threads for the current user
router.get('/dms', async (req, res) => {
  try {
    const userId = req.user.id;
    const orgId = await resolveOrgId(req);

    const result = await db.query(
      `SELECT dt.*,
              CASE WHEN dt.user_a = $2 THEN pb.id ELSE pa.id END as other_user_id,
              CASE WHEN dt.user_a = $2 THEN pb.first_name ELSE pa.first_name END as other_first_name,
              CASE WHEN dt.user_a = $2 THEN pb.last_name ELSE pa.last_name END as other_last_name,
              CASE WHEN dt.user_a = $2 THEN pb.avatar_url ELSE pa.avatar_url END as other_avatar_url,
              CASE WHEN dt.user_a = $2 THEN COALESCE(pb.profession, pb.ams_role, ub.role, 'Member') ELSE COALESCE(pa.profession, pa.ams_role, ua.role, 'Member') END as other_role,
              CASE WHEN dt.user_a = $2 THEN pb.profession ELSE pa.profession END as other_profession,
              (
                SELECT COUNT(*)::int FROM chat_messages m
                LEFT JOIN message_reads mr ON mr.message_id = m.id AND mr.user_id = $2
                WHERE m.dm_thread_id = dt.id
                  AND m.deleted_at IS NULL
                  AND m.user_id != $2
                  AND mr.id IS NULL
              ) as unread_count,
              (
                SELECT json_build_object(
                  'content', lm.content,
                  'created_at', lm.created_at,
                  'user_id', lm.user_id
                )
                FROM chat_messages lm
                WHERE lm.dm_thread_id = dt.id AND lm.deleted_at IS NULL
                ORDER BY lm.created_at DESC LIMIT 1
              ) as last_message
       FROM direct_message_threads dt
       JOIN profiles pa ON pa.id = dt.user_a
       LEFT JOIN users ua ON ua.id = pa.id
       JOIN profiles pb ON pb.id = dt.user_b
       LEFT JOIN users ub ON ub.id = pb.id
       WHERE (dt.organization_id = $1 OR $1 IS NULL)
         AND (dt.user_a = $2 OR dt.user_b = $2)
       ORDER BY COALESCE(dt.last_message_at, dt.created_at) DESC`,
      [orgId || null, userId]
    );
    res.json({ dms: result.rows });
  } catch (err) {
    console.error('[Messenger] Error fetching DMs:', err);
    res.status(500).json({ error: 'Failed to fetch DMs' });
  }
});

// POST /api/messenger/dms
// Start or retrieve an existing DM thread with another user
router.post('/dms', async (req, res) => {
  try {
    const userId = req.user.id;
    const orgId = await resolveOrgId(req);
    const { other_user_id } = req.body;

    if (!other_user_id) return res.status(400).json({ error: 'other_user_id is required' });
    if (other_user_id === userId) return res.status(400).json({ error: 'Cannot DM yourself' });

    // Ensure profiles exist for both users to satisfy foreign key constraints
    for (const uid of [userId, other_user_id]) {
      const pCheck = await db.query(`SELECT id FROM profiles WHERE id = $1`, [uid]);
      if (pCheck.rows.length === 0) {
        const uRes = await db.query(`SELECT email, role FROM users WHERE id = $1`, [uid]);
        const email = uRes.rows[0]?.email || 'user';
        const parts = email.split('@')[0].split(/[._-]/);
        const fn = parts[0]?.charAt(0).toUpperCase() + parts[0]?.slice(1) || 'Staff';
        const ln = parts[1]?.charAt(0).toUpperCase() + parts[1]?.slice(1) || '';
        await db.query(
          `INSERT INTO profiles (id, first_name, last_name, organization_id, is_approved)
           VALUES ($1, $2, $3, $4, true)
           ON CONFLICT (id) DO NOTHING`,
          [uid, fn, ln, orgId]
        );
      }
    }

    const [userA, userB] = [userId, other_user_id].sort(); // canonical order

    const result = await db.query(
      `INSERT INTO direct_message_threads (organization_id, user_a, user_b)
       VALUES ($1, $2, $3)
       ON CONFLICT (organization_id, user_a, user_b) DO UPDATE SET organization_id = EXCLUDED.organization_id
       RETURNING *`,
      [orgId, userA, userB]
    );
    res.json({ dm_thread: result.rows[0] });
  } catch (err) {
    console.error('[Messenger] Error creating DM thread:', err);
    res.status(500).json({ error: 'Failed to create DM thread' });
  }
});

// GET /api/messenger/dms/:id/messages?before=<cursor>&limit=50
router.get('/dms/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const before = parseCursor(req.query.before);

    // Verify user is part of this DM thread
    const thread = await db.query(
      `SELECT * FROM direct_message_threads WHERE id = $1`,
      [id]
    );
    if (thread.rows.length === 0) return res.status(404).json({ error: 'DM thread not found' });
    const t = thread.rows[0];
    if (t.user_a !== userId && t.user_b !== userId) {
      return res.status(403).json({ error: 'Not part of this DM thread' });
    }

    const result = await db.query(
      `SELECT m.id, m.organization_id, m.channel_id, m.dm_thread_id, m.user_id, m.bot_id, m.parent_message_id,
              m.message_type, m.is_edited, m.edited_at, m.created_at, m.deleted_at,
              CASE WHEN m.deleted_at IS NOT NULL THEN TRUE ELSE FALSE END as is_deleted,
              CASE WHEN m.deleted_at IS NOT NULL THEN NULL ELSE m.content END as content,
              CASE WHEN m.deleted_at IS NOT NULL THEN NULL ELSE m.content_html END as content_html,
              p.first_name, p.last_name, p.avatar_url,
              COALESCE(p.profession, p.ams_role, u.role, 'Member') as role,
              (
                SELECT json_agg(json_build_object(
                  'emoji', r.emoji,
                  'count', r.cnt,
                  'users', r.users
                )) FROM (
                  SELECT emoji,
                         COUNT(*)::int as cnt,
                         json_agg(user_id) as users
                  FROM message_reactions
                  WHERE message_id = m.id
                  GROUP BY emoji
                ) r
              ) as reactions,
              CASE WHEN m.deleted_at IS NOT NULL THEN NULL ELSE (
                SELECT json_agg(json_build_object(
                  'id', a.id, 'file_name', a.file_name,
                  'file_url', a.file_url, 'file_size', a.file_size, 'mime_type', a.mime_type
                )) FROM message_attachments a WHERE a.message_id = m.id
              ) END as attachments
       FROM chat_messages m
       LEFT JOIN profiles p ON p.id = m.user_id
       LEFT JOIN users u ON u.id = p.id
       WHERE m.dm_thread_id = $1
         AND ($2::timestamptz IS NULL OR m.created_at < $2)
       ORDER BY m.created_at DESC
       LIMIT $3`,
      [id, before, limit]
    );
    res.json({ messages: result.rows.reverse(), has_more: result.rows.length === limit });
  } catch (err) {
    console.error('[Messenger] Error fetching DM messages:', err);
    res.status(500).json({ error: 'Failed to fetch DM messages' });
  }
});

// POST /api/messenger/dms/:id/messages
// Send a DM (REST fallback)
router.post('/dms/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const orgId = await resolveOrgId(req);
    const { content, content_html, attachments } = req.body;

    if (!content && !content_html && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: 'Message content or attachment is required' });
    }

    const thread = await db.query(
      `SELECT * FROM direct_message_threads WHERE id = $1`,
      [id]
    );
    if (thread.rows.length === 0) return res.status(404).json({ error: 'DM thread not found' });
    const t = thread.rows[0];
    if (t.user_a !== userId && t.user_b !== userId) {
      return res.status(403).json({ error: 'Not part of this DM thread' });
    }

    const result = await db.query(
      `INSERT INTO chat_messages
         (organization_id, dm_thread_id, user_id, message_type, content, content_html)
       VALUES ($1, $2, $3, 'user', $4, $5)
       RETURNING *`,
      [orgId, id, userId, content || '', content_html || null]
    );

    const msgRow = result.rows[0];
    let savedAttachments = [];
    if (Array.isArray(attachments) && attachments.length > 0) {
      for (const att of attachments) {
        const attRes = await db.query(
          `INSERT INTO message_attachments (message_id, file_name, file_url, file_size, mime_type, uploaded_by)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, file_name, file_url, file_size, mime_type`,
          [msgRow.id, att.file_name || att.name, att.file_url || att.url, att.file_size || att.size || null, att.mime_type || att.mime || null, userId]
        );
        if (attRes.rows.length > 0) {
          savedAttachments.push(attRes.rows[0]);
        }
      }
    }

    // Update direct_message_threads timestamp
    await db.query(`UPDATE direct_message_threads SET last_message_at = NOW() WHERE id = $1`, [id]);

    const profile = await db.query(
      `SELECT p.first_name, p.last_name, p.avatar_url,
              COALESCE(p.profession, p.ams_role, u.role, 'Member') as role
       FROM profiles p
       LEFT JOIN users u ON u.id = p.id
       WHERE p.id = $1`, [userId]
    );
    const fullMsg = { ...msgRow, ...profile.rows[0], attachments: savedAttachments };

    const io = req.app.get('io');
    if (io) {
      const otherId = t.user_a === userId ? t.user_b : t.user_a;
      io.to(`dm:${id}`).emit('new_dm_message', fullMsg);
      io.to(`user:${userId}`).emit('new_dm_message', fullMsg);
      io.to(`user:${otherId}`).emit('new_dm_message', fullMsg);
      io.to(`user:${otherId}`).emit('new_message', fullMsg);
      io.to(`user:${otherId}`).emit('dm_notification', {
        dm_thread_id: id,
        sender_id: userId,
        sender_name: `${profile.rows[0]?.first_name || 'Team'} ${profile.rows[0]?.last_name || 'Member'}`.trim(),
        content: content || (savedAttachments.length > 0 ? `📎 ${savedAttachments[0].file_name}` : 'Sent a file'),
        created_at: new Date().toISOString()
      });
    }

    res.status(201).json({ message: fullMsg });
  } catch (err) {
    console.error('[Messenger] Error sending DM:', err);
    res.status(500).json({ error: 'Failed to send DM' });
  }
});

// ================================================================
// SEARCH
// ================================================================

// GET /api/messenger/search?q=<query>&org_id=
router.get('/search', async (req, res) => {
  try {
    const userId = req.user.id;
    const orgId = req.query.org_id || userOrgId(req);
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const result = await db.query(
      `SELECT m.id, m.content, m.created_at, m.channel_id, m.dm_thread_id,
              m.message_type, m.user_id,
              p.first_name, p.last_name, p.avatar_url,
              c.name as channel_name
       FROM chat_messages m
       LEFT JOIN profiles p ON p.id = m.user_id
       LEFT JOIN chat_channels c ON c.id = m.channel_id
       -- Only search channels the user is a member of
       LEFT JOIN channel_members cm ON cm.channel_id = m.channel_id AND cm.user_id = $2
       WHERE m.organization_id = $1
         AND m.deleted_at IS NULL
         AND to_tsvector('english', coalesce(m.content, '')) @@ plainto_tsquery('english', $3)
         AND (cm.user_id IS NOT NULL OR m.dm_thread_id IS NOT NULL)
       ORDER BY m.created_at DESC
       LIMIT 50`,
      [orgId, userId, q.trim()]
    );
    res.json({ results: result.rows, query: q });
  } catch (err) {
    console.error('[Messenger] Error searching:', err);
    res.status(500).json({ error: 'Failed to search messages' });
  }
});

// ================================================================
// PEOPLE DIRECTORY
// ================================================================

// GET /api/messenger/users?org_id=
// List all members of the organization (for DM, invite, mentions)
router.get('/users', async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const orgId = await resolveOrgId(req);

    // 1. Ensure requesting user has a profile record if missing (e.g. super_admin)
    const selfProf = await db.query(`SELECT id FROM profiles WHERE id = $1`, [currentUserId]);
    if (selfProf.rows.length === 0) {
      const userRes = await db.query(`SELECT email, role FROM users WHERE id = $1`, [currentUserId]);
      const userEmail = userRes.rows[0]?.email || 'user';
      const nameParts = userEmail.split('@')[0].split(/[._-]/);
      const fName = nameParts[0]?.charAt(0).toUpperCase() + nameParts[0]?.slice(1) || 'Super';
      const lName = nameParts[1]?.charAt(0).toUpperCase() + nameParts[1]?.slice(1) || 'Admin';
      await db.query(
        `INSERT INTO profiles (id, first_name, last_name, organization_id, is_approved)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (id) DO NOTHING`,
        [currentUserId, fName, lName, orgId]
      );
    }

    // 2. Ensure requesting user is enrolled in default/public channels
    if (orgId) {
      await db.query(
        `INSERT INTO channel_members (channel_id, user_id, role)
         SELECT id, $2, 'member'
         FROM chat_channels
         WHERE (organization_id = $1 OR organization_id IS NULL) AND (is_default = TRUE OR channel_type = 'public') AND deleted_at IS NULL
         ON CONFLICT (channel_id, user_id) DO NOTHING`,
        [orgId, currentUserId]
      );
      await db.query(
        `INSERT INTO user_organizations (user_id, organization_id, role)
         VALUES ($1, $2, 'member')
         ON CONFLICT (user_id, organization_id) DO NOTHING`,
        [currentUserId, orgId]
      );
    }

    // 3. Fetch all team members dynamically from users joined with profiles and user_organizations
    let result;
    if (orgId) {
      result = await db.query(
        `SELECT DISTINCT 
            u.id, 
            COALESCE(NULLIF(p.first_name, ''), split_part(u.email, '@', 1), 'Staff') as first_name,
            COALESCE(p.last_name, '') as last_name,
            p.avatar_url, 
            COALESCE(p.profession, p.ams_role, u.role, 'Member') as role, 
            p.profession, 
            p.ams_role, 
            u.email, 
            p.uhid
         FROM users u
         LEFT JOIN profiles p ON p.id = u.id
         LEFT JOIN user_organizations uo ON uo.user_id = u.id
         WHERE (p.organization_id = $1 OR uo.organization_id = $1 OR p.organization_id IS NULL)
           AND u.id != $2
         ORDER BY first_name ASC`,
        [orgId, currentUserId]
      );
    } else {
      result = await db.query(
        `SELECT DISTINCT 
            u.id, 
            COALESCE(NULLIF(p.first_name, ''), split_part(u.email, '@', 1), 'Staff') as first_name,
            COALESCE(p.last_name, '') as last_name,
            p.avatar_url, 
            COALESCE(p.profession, p.ams_role, u.role, 'Member') as role, 
            p.profession, 
            p.ams_role, 
            u.email, 
            p.uhid
         FROM users u
         LEFT JOIN profiles p ON p.id = u.id
         WHERE u.id != $1
         ORDER BY first_name ASC
         LIMIT 100`,
        [currentUserId]
      );
    }
    res.json({ users: result.rows });
  } catch (err) {
    console.error('[Messenger] Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ================================================================
// TEAMCOMMS SETTINGS (Admin)
// ================================================================

// GET /api/messenger/settings
router.get('/settings', async (req, res) => {
  try {
    const orgId = await resolveOrgId(req);
    const result = await db.query(
      `SELECT ts.*,
              (SELECT json_agg(json_build_object(
                'id', sr.id, 'report_type', sr.report_type,
                'cron_expression', sr.cron_expression, 'is_active', sr.is_active,
                'channel_id', sr.channel_id, 'last_run_at', sr.last_run_at
              ))
               FROM teamcomms_scheduled_reports sr WHERE sr.organization_id = $1) as scheduled_reports
       FROM teamcomms_settings ts WHERE ts.organization_id = $1`,
      [orgId]
    );
    if (result.rows.length === 0) {
      // Auto-create settings
      await db.query(`INSERT INTO teamcomms_settings (organization_id) VALUES ($1) ON CONFLICT DO NOTHING`, [orgId]);
      return res.json({ settings: { organization_id: orgId, is_enabled: true }, scheduled_reports: [] });
    }
    res.json({ settings: result.rows[0] });
  } catch (err) {
    console.error('[Messenger] Error fetching settings:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PATCH /api/messenger/settings
router.patch('/settings', async (req, res) => {
  try {
    const orgId = await resolveOrgId(req);
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const {
      is_enabled, notify_task_assigned, notify_task_overdue, notify_appointment,
      notify_leave, notify_clinical_report, notify_meal_plan, notify_membership_expiry,
      report_channel_id
    } = req.body;

    const result = await db.query(
      `INSERT INTO teamcomms_settings (
         organization_id, is_enabled, notify_task_assigned, notify_task_overdue,
         notify_appointment, notify_leave, notify_clinical_report, notify_meal_plan,
         notify_membership_expiry, report_channel_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (organization_id) DO UPDATE SET
         is_enabled = COALESCE($2, teamcomms_settings.is_enabled),
         notify_task_assigned = COALESCE($3, teamcomms_settings.notify_task_assigned),
         notify_task_overdue = COALESCE($4, teamcomms_settings.notify_task_overdue),
         notify_appointment = COALESCE($5, teamcomms_settings.notify_appointment),
         notify_leave = COALESCE($6, teamcomms_settings.notify_leave),
         notify_clinical_report = COALESCE($7, teamcomms_settings.notify_clinical_report),
         notify_meal_plan = COALESCE($8, teamcomms_settings.notify_meal_plan),
         notify_membership_expiry = COALESCE($9, teamcomms_settings.notify_membership_expiry),
         report_channel_id = COALESCE($10, teamcomms_settings.report_channel_id),
         updated_at = NOW()
       RETURNING *`,
      [
        orgId, is_enabled, notify_task_assigned, notify_task_overdue,
        notify_appointment, notify_leave, notify_clinical_report,
        notify_meal_plan, notify_membership_expiry, report_channel_id || null
      ]
    );
    res.json({ settings: result.rows[0] });
  } catch (err) {
    console.error('[Messenger] Error updating settings:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ================================================================
// SCHEDULED REPORTS (Admin)
// ================================================================

// POST /api/messenger/scheduled-reports
router.post('/scheduled-reports', async (req, res) => {
  try {
    const orgId = await resolveOrgId(req);
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { channel_id, report_type, cron_expression } = req.body;
    if (!channel_id || !report_type || !cron_expression) {
      return res.status(400).json({ error: 'channel_id, report_type, and cron_expression are required' });
    }
    const result = await db.query(
      `INSERT INTO teamcomms_scheduled_reports
         (organization_id, channel_id, report_type, cron_expression, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [orgId, channel_id, report_type, cron_expression, req.user.id]
    );
    res.status(201).json({ report: result.rows[0] });
  } catch (err) {
    console.error('[Messenger] Error creating scheduled report:', err);
    res.status(500).json({ error: 'Failed to create scheduled report' });
  }
});

// DELETE /api/messenger/scheduled-reports/:id
router.delete('/scheduled-reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = userOrgId(req);
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    await db.query(
      `DELETE FROM teamcomms_scheduled_reports WHERE id = $1 AND organization_id = $2`,
      [id, orgId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[Messenger] Error deleting scheduled report:', err);
    res.status(500).json({ error: 'Failed to delete scheduled report' });
  }
});

export default router;
