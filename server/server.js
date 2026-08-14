import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
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
import { requireAuth } from './middleware.js';
import { db } from './db.js';

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');

const app = express();
const PORT = process.env.PORT || 3000;
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

// Start server
app.listen(PORT, () => {
  console.log(`[SERVER] Running on http://localhost:${PORT}`);
});
// Hot-reload trigger comment - refreshed
