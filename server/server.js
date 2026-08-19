import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import authRoutes from './auth.js';
import masterConsoleRoutes from './masterConsole.js';
import uploadRoutes from './upload.js';
import clientRoutes from './clients.js';
import appointmentRoutes from './appointments.js';
import hrRoutes from './hr.js';
import billingRoutes from './billing.js';
import clinicalRoutes from './clinical.js';
import amsRoutes from './ams.js';
import adminRoutes from './admin.js';
import analyticsRoutes from './analytics.js';
import plannerRoutes from './planner.js';
import messengerRoutes from './messenger.js';
import { startNotificationBridge } from './notification_bridge.js';
import { startScheduler } from './scheduler.js';
import { requireAuth } from './middleware.js';
import { db } from './db.js';

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────────────────────────
// Socket.io — TeamComms real-time engine
// ─────────────────────────────────────────────────────────────
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
});

// Socket.io JWT authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) return next(new Error('Unauthorized: No token'));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod');
    socket.user = payload;
    next();
  } catch (err) {
    next(new Error('Unauthorized: Invalid token'));
  }
});

io.on('connection', (socket) => {
  const { id: userId, organization_id: orgId } = socket.user;
  console.log(`[Socket.io] User ${userId} connected`);

  // Personal notification room
  socket.join(`user:${userId}`);

  // Join a channel room
  socket.on('join_channel', ({ channel_id }) => {
    if (channel_id) socket.join(`${orgId}:${channel_id}`);
  });

  // Leave a channel room
  socket.on('leave_channel', ({ channel_id }) => {
    if (channel_id) socket.leave(`${orgId}:${channel_id}`);
  });

  // Join a DM room
  socket.on('join_dm', ({ dm_thread_id }) => {
    if (dm_thread_id) socket.join(`dm:${dm_thread_id}`);
  });

  // Leave a DM room
  socket.on('leave_dm', ({ dm_thread_id }) => {
    if (dm_thread_id) socket.leave(`dm:${dm_thread_id}`);
  });

  // Send a message via Socket.io (preferred over REST)
  socket.on('send_message', async (data) => {
    try {
      const { channel_id, dm_thread_id, content, content_html, parent_message_id, attachments } = data;
      if (!content && !content_html && (!attachments || attachments.length === 0)) return;

      const result = await db.query(
        `INSERT INTO chat_messages
           (organization_id, channel_id, dm_thread_id, user_id, message_type, content, content_html, parent_message_id)
         VALUES ($1, $2, $3, $4, 'user', $5, $6, $7)
         RETURNING *`,
        [orgId, channel_id || null, dm_thread_id || null, userId,
         content || '', content_html || null, parent_message_id || null]
      );

      const msgRow = result.rows[0];

      // Save attachments if provided
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

      const profile = await db.query(
        `SELECT p.first_name, p.last_name, p.avatar_url,
                COALESCE(p.profession, p.ams_role, u.role, 'Member') as role
         FROM profiles p
         LEFT JOIN users u ON u.id = p.id
         WHERE p.id = $1`, [userId]
      );
      const message = { 
        ...msgRow, 
        ...profile.rows[0],
        attachments: savedAttachments.length > 0 ? savedAttachments : undefined
      };

      if (channel_id) {
        io.to(`${orgId}:${channel_id}`).emit('new_message', message);
      } else if (dm_thread_id) {
        // Update direct_message_threads timestamp
        await db.query(
          `UPDATE direct_message_threads SET last_message_at = NOW() WHERE id = $1`,
          [dm_thread_id]
        );

        // Get the other user from the DM thread and notify their personal room
        const thread = await db.query(
          `SELECT user_a, user_b FROM direct_message_threads WHERE id = $1`, [dm_thread_id]
        );
        if (thread.rows.length > 0) {
          const t = thread.rows[0];
          const otherId = t.user_a === userId ? t.user_b : t.user_a;

          // Emit to both users and dm room
          io.to(`user:${otherId}`).emit('new_dm_message', message);
          io.to(`user:${otherId}`).emit('new_message', message);
          io.to(`user:${userId}`).emit('new_dm_message', message);
          io.to(`dm:${dm_thread_id}`).emit('new_dm_message', message);
          socket.emit('new_dm_message', message);

          // Emit instant notification event to receiver
          io.to(`user:${otherId}`).emit('dm_notification', {
            dm_thread_id,
            sender_id: userId,
            sender_name: `${profile.rows[0]?.first_name || 'Team'} ${profile.rows[0]?.last_name || 'Member'}`.trim(),
            content: content || (savedAttachments.length > 0 ? `📎 ${savedAttachments[0].file_name}` : 'Sent a file'),
            created_at: new Date().toISOString()
          });
        }
      }
    } catch (err) {
      console.error('[Socket.io] Error handling send_message:', err);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Typing indicators
  socket.on('typing_start', ({ channel_id }) => {
    if (channel_id) {
      socket.to(`${orgId}:${channel_id}`).emit('user_typing', {
        user_id: userId,
        channel_id,
      });
    }
  });

  socket.on('typing_stop', ({ channel_id }) => {
    if (channel_id) {
      socket.to(`${orgId}:${channel_id}`).emit('typing_stopped', {
        user_id: userId,
        channel_id,
      });
    }
  });

  // Toggle emoji reaction
  socket.on('toggle_reaction', async ({ message_id, emoji, channel_id, dm_thread_id }) => {
    try {
      if (!message_id || !emoji) return;

      const existing = await db.query(
        `SELECT id FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3`,
        [message_id, userId, emoji]
      );

      let action = 'added';
      if (existing.rows.length > 0) {
        await db.query(
          `DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3`,
          [message_id, userId, emoji]
        );
        action = 'removed';
      } else {
        await db.query(
          `INSERT INTO message_reactions (message_id, user_id, emoji) VALUES ($1, $2, $3)`,
          [message_id, userId, emoji]
        );
        action = 'added';
      }

      const reactRes = await db.query(
        `SELECT emoji,
                COUNT(*)::int as count,
                json_agg(user_id) as users
         FROM message_reactions
         WHERE message_id = $1
         GROUP BY emoji`,
        [message_id]
      );

      const payload = {
        message_id,
        reactions: reactRes.rows || [],
        user_id: userId,
        emoji,
        action,
      };

      if (channel_id) {
        io.to(`${orgId}:${channel_id}`).emit('reaction_updated', payload);
      } else if (dm_thread_id) {
        io.to(`dm:${dm_thread_id}`).emit('reaction_updated', payload);
        const thread = await db.query(
          `SELECT user_a, user_b FROM direct_message_threads WHERE id = $1`, [dm_thread_id]
        );
        if (thread.rows.length > 0) {
          const otherId = thread.rows[0].user_a === userId ? thread.rows[0].user_b : thread.rows[0].user_a;
          io.to(`user:${otherId}`).emit('reaction_updated', payload);
          io.to(`user:${userId}`).emit('reaction_updated', payload);
        }
      } else {
        io.emit('reaction_updated', payload);
      }
    } catch (err) {
      console.error('[Socket.io] Error in toggle_reaction:', err);
    }
  });

  // Delete message
  socket.on('delete_message', async ({ message_id, channel_id, dm_thread_id }) => {
    try {
      if (!message_id) return;
      const isAdmin = ['admin', 'super_admin'].includes(socket.user?.role);
      const whereClause = isAdmin
        ? `WHERE id = $1 AND deleted_at IS NULL`
        : `WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`;
      const params = isAdmin ? [message_id] : [message_id, userId];

      const result = await db.query(
        `UPDATE chat_messages SET deleted_at = NOW() ${whereClause} RETURNING id, channel_id, dm_thread_id, user_id, deleted_at`,
        params
      );

      if (result.rows.length > 0) {
        const deletedRow = result.rows[0];
        const payload = {
          message_id: deletedRow.id,
          channel_id: deletedRow.channel_id || channel_id,
          dm_thread_id: deletedRow.dm_thread_id || dm_thread_id,
          deleted_at: deletedRow.deleted_at,
          user_id: userId,
        };

        if (deletedRow.channel_id) {
          io.to(`${orgId}:${deletedRow.channel_id}`).emit('message_deleted', payload);
        }
        if (deletedRow.dm_thread_id) {
          io.to(`dm:${deletedRow.dm_thread_id}`).emit('message_deleted', payload);
          const thread = await db.query(
            `SELECT user_a, user_b FROM direct_message_threads WHERE id = $1`, [deletedRow.dm_thread_id]
          );
          if (thread.rows.length > 0) {
            const otherId = thread.rows[0].user_a === userId ? thread.rows[0].user_b : thread.rows[0].user_a;
            io.to(`user:${otherId}`).emit('message_deleted', payload);
            io.to(`user:${userId}`).emit('message_deleted', payload);
          }
        }
        socket.emit('message_deleted', payload);
      }
    } catch (err) {
      console.error('[Socket.io] Error in delete_message:', err);
    }
  });

  // Mark channel read
  socket.on('mark_channel_read', async ({ channel_id }) => {
    try {
      if (channel_id) {
        await db.query(
          `UPDATE channel_members SET last_read_at = NOW() WHERE channel_id = $1 AND user_id = $2`,
          [channel_id, userId]
        );
        socket.to(`${orgId}:${channel_id}`).emit('read_receipt', { user_id: userId, channel_id });
      }
    } catch (err) {
      console.error('[Socket.io] Error marking channel read:', err);
    }
  });

  // Mark DM thread read
  socket.on('mark_dm_read', async ({ dm_thread_id }) => {
    try {
      if (dm_thread_id) {
        await db.query(
          `INSERT INTO message_reads (message_id, user_id)
           SELECT m.id, $2
           FROM chat_messages m
           WHERE m.dm_thread_id = $1
             AND m.user_id != $2
             AND m.deleted_at IS NULL
           ON CONFLICT (message_id, user_id) DO NOTHING`,
          [dm_thread_id, userId]
        );
        io.to(`dm:${dm_thread_id}`).emit('read_receipt', { user_id: userId, dm_thread_id });
      }
    } catch (err) {
      console.error('[Socket.io] Error marking DM read:', err);
    }
  });

  // Generic mark read
  socket.on('mark_read', async ({ channel_id, dm_thread_id }) => {
    try {
      if (channel_id) {
        await db.query(
          `UPDATE channel_members SET last_read_at = NOW() WHERE channel_id = $1 AND user_id = $2`,
          [channel_id, userId]
        );
      }
      if (dm_thread_id) {
        await db.query(
          `INSERT INTO message_reads (message_id, user_id)
           SELECT m.id, $2
           FROM chat_messages m
           WHERE m.dm_thread_id = $1
             AND m.user_id != $2
             AND m.deleted_at IS NULL
           ON CONFLICT (message_id, user_id) DO NOTHING`,
          [dm_thread_id, userId]
        );
      }
    } catch (err) {
      console.error('[Socket.io] Error marking read:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] User ${userId} disconnected`);
    io.to(`${orgId}:general`).emit('user_offline', { user_id: userId });
  });
});
console.log('DATABASE_URL is:', process.env.DATABASE_URL);
console.log('PGHOST:', process.env.PGHOST);
console.log('PGPORT:', process.env.PGPORT);
console.log('PGDATABASE:', process.env.PGDATABASE);
console.log('PGUSER:', process.env.PGUSER);

// Middleware
app.use(cors()); // Used for dev, but Nginx proxy will bypass CORS anyway
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(uploadsDir));

// Debug log middleware for responses >= 400
app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function (body) {
    if (res.statusCode >= 400) {
      try {
        const logMsg = `[${new Date().toISOString()}] ${req.method} ${req.url} - Status: ${res.statusCode} - Body: ${body}\nHeaders: ${JSON.stringify(req.headers)}\n\n`;
        fs.appendFileSync(path.join(__dirname, 'debug_requests.log'), logMsg);
      } catch (err) {
        console.error('Error writing debug request log:', err);
      }
    }
    return originalSend.apply(this, arguments);
  };
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/master-console', masterConsoleRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/clinical', clinicalRoutes);
app.use('/api/ams', amsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/planner', plannerRoutes);
app.use('/api/messenger', messengerRoutes);

// --- Public Routes ---
app.get('/api/public/orgs/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const result = await db.query('SELECT id, name, logo_url FROM organizations WHERE slug = $1', [slug]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Organization not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/public/enquiries', async (req, res) => {
  try {
    const { 
      organization_id, first_name, last_name, mobile_no, email, 
      looking_for, preferred_call_time, referral_source, referral_details, 
      work_place, notes 
    } = req.body;
    
    const result = await db.query(`
      INSERT INTO enquiries (
        organization_id, first_name, last_name, mobile_no, email, 
        looking_for, preferred_call_time, referral_source, referral_details, 
        work_place, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `, [
      organization_id, first_name, last_name, mobile_no, email, 
      looking_for, preferred_call_time, referral_source, referral_details, 
      work_place, notes
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Organization Route (Phase 1)
app.get('/api/organizations/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const orgRes = await db.query('SELECT * FROM organizations WHERE id = $1', [id]);
    const org = orgRes.rows[0];
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    // Convert boolean integers back to booleans to match Supabase behavior
    org.enable_geofencing = Boolean(org.enable_geofencing);
    org.enable_ip_locking = Boolean(org.enable_ip_locking);
    org.allow_custom_duration = Boolean(org.allow_custom_duration);
    
    res.json({ data: org });
  } catch (err) {
    console.error('[SERVER ERROR]', err);
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

app.get('/api/organizations/:id/settings', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const orgRes = await db.query('SELECT allow_custom_duration, default_slot_duration, default_checkout_time, default_shift_end_time FROM organizations WHERE id = $1', [id]);
    if (orgRes.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    const settings = orgRes.rows[0];
    settings.allow_custom_duration = Boolean(settings.allow_custom_duration);
    res.json(settings);
  } catch (err) {
    console.error('[SERVER ERROR]', err);
    res.status(500).json({ error: 'Failed to fetch organization settings' });
  }
});

app.patch('/api/organizations/:id/settings', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { allow_custom_duration, default_slot_duration, default_checkout_time, default_shift_end_time } = req.body;
  const shiftTime = default_shift_end_time || default_checkout_time || null;
  try {
    const result = await db.query(
      `UPDATE organizations
       SET allow_custom_duration = $1,
           default_slot_duration = $2,
           default_checkout_time = COALESCE($3::time, default_checkout_time),
           default_shift_end_time = COALESCE($3::time, default_shift_end_time)
       WHERE id = $4
       RETURNING allow_custom_duration, default_slot_duration, default_checkout_time, default_shift_end_time`,
      [allow_custom_duration, default_slot_duration, shiftTime, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    const settings = result.rows[0];
    settings.allow_custom_duration = Boolean(settings.allow_custom_duration);
    res.json(settings);
  } catch (err) {
    console.error('[SERVER ERROR]', err);
    res.status(500).json({ error: 'Failed to update organization settings' });
  }
});


// Sample Protected Route
app.get('/api/patients', requireAuth, (req, res) => {
  // In a real application, you would query the database here.
  // For demonstration, we'll return mock data.
  res.json({
    message: `Welcome ${req.user.email}! Here is the patient data.`,
    data: [
      { id: 1, name: 'John Doe', condition: 'ACL Tear' },
      { id: 2, name: 'Jane Smith', condition: 'Rotator Cuff Tendinitis' }
    ]
  });
});

// Active SSE Connections registry
const activeConnections = new Set();

// Start Postgres listener
async function startPgListener() {
  let pgListenClient;
  try {
    pgListenClient = await db.connect();
    
    // Attach error handler immediately to avoid unhandled error events
    pgListenClient.on('error', (err) => {
      console.error('[SSE] Postgres listener client error, reconnecting:', err.message);
      try {
        pgListenClient.release(true);
      } catch (e) {}
      setTimeout(startPgListener, 5000);
    });

    await pgListenClient.query('LISTEN system_notifications');
    console.log('[SSE] Listening to Postgres system_notifications channel');
    
    pgListenClient.on('notification', (msg) => {
      try {
        const notification = JSON.parse(msg.payload);
        // Broadcast to matching connections
        for (const conn of activeConnections) {
          // Check multi-tenant isolation
          if (conn.orgId === notification.organization_id) {
            // Target checks
            const isBroadcast = notification.is_broadcast || notification.category === 'global_announcement';
            const matchesUser = notification.target_user_id === conn.userId;
            const matchesRole = notification.target_role === conn.role 
              || (notification.target_role === 'admin' && conn.role === 'super_admin')
              || (notification.target_role === 'athlete' && (conn.role === 'athlete' || conn.role === 'client'))
              || (notification.target_role === 'specialist' && ['sports_scientist', 'sports_physician', 'physiotherapist', 'nutritionist', 'massage_therapist', 'coach'].includes(conn.role));
            const isLegacyAdmin = !notification.target_user_id && !notification.target_role && !notification.is_broadcast && (conn.role === 'admin' || conn.role === 'super_admin');

            if (isBroadcast || matchesUser || matchesRole || isLegacyAdmin) {
              conn.res.write(`data: ${JSON.stringify(notification)}\n\n`);
            }
          }
        }
      } catch (e) {
        console.error('Error handling pg notification payload:', e);
      }
    });
  } catch (err) {
    console.error('[SSE] Failed to establish Postgres listener, retrying:', err.message);
    if (pgListenClient) {
      try { pgListenClient.release(true); } catch (e) {}
    }
    setTimeout(startPgListener, 5000);
  }
}
startPgListener();

// SSE Stream route
app.get('/api/notifications/stream', (req, res) => {
  let token = req.query.token;
  if (!token && req.headers.authorization) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod');
    req.user = payload;
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

  const orgId = req.user.organization_id;
  const userId = req.user.id;
  const role = req.user.role;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const conn = { res, orgId, userId, role };
  activeConnections.add(conn);

  // Send keepalive comment
  res.write(': keep-alive\n\n');

  req.on('close', () => {
    activeConnections.delete(conn);
  });
});

// Basic Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Generic error handling
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server (use httpServer so Socket.io shares the port)
httpServer.listen(PORT, () => {
  console.log(`[SERVER] Running on http://localhost:${PORT}`);
  // Start TeamComms subsystems after server is up
  startNotificationBridge(io).catch((err) =>
    console.error('[SERVER] NotificationBridge failed to start:', err)
  );
  startScheduler(io).catch((err) =>
    console.error('[SERVER] Scheduler failed to start:', err)
  );
});
// Hot-reload trigger comment - refreshed
