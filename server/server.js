import 'dotenv/config';
import express from 'express';
import cors from 'cors';
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
import reportRoutes from './reports.js';
import { requireAuth } from './middleware.js';
import { db } from './db.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Used for dev, but Nginx proxy will bypass CORS anyway
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

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
app.use('/api/reports', reportRoutes);

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
    const orgRes = await db.query('SELECT allow_custom_duration, default_slot_duration FROM organizations WHERE id = $1', [id]);
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
  const { allow_custom_duration, default_slot_duration } = req.body;
  try {
    const result = await db.query(
      'UPDATE organizations SET allow_custom_duration = $1, default_slot_duration = $2 WHERE id = $3 RETURNING allow_custom_duration, default_slot_duration',
      [allow_custom_duration, default_slot_duration, id]
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
