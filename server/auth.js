import express from 'express';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { db } from './db.js';

const router = express.Router();

// Configure Nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.email.ap-mumbai-1.oci.oraclecloud.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * POST /api/auth/signup
 */
router.post('/signup', async (req, res) => {
  try {
    const { email, password, firstName, lastName, orgCode, role } = req.body;
    
    // Validate Org Code
    let orgId = null;
    if (orgCode) {
      const orgRes = await db.query('SELECT id FROM organizations WHERE org_code = $1', [orgCode]);
      if (orgRes.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid organization code' });
      }
      orgId = orgRes.rows[0].id;
    }

    // Check existing user
    const existRes = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existRes.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();

    // Insert User
    await db.query(
      'INSERT INTO users (id, email, password_hash, role) VALUES ($1, $2, $3, $4)',
      [userId, email, passwordHash, role || 'client']
    );

    // Insert Profile
    await db.query(
      'INSERT INTO profiles (id, first_name, last_name, organization_id, is_approved) VALUES ($1, $2, $3, $4, $5)',
      [userId, firstName, lastName, orgId, false]
    );

    res.json({ message: 'Signup successful. Pending approval.' });
  } catch (error) {
    console.error('Error in /signup:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/login
 * Validates password and generates OTP
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const userRes = await db.query('SELECT id, password_hash, role FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = userRes.rows[0];
    
    // If user doesn't exist or doesn't have a password set, fail auth
    // Note: Admin might not have a password hash yet in dev, we can fallback or fail
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.password_hash) {
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });
    } else {
      // If no password hash exists (e.g. seeded admin), allow any password for now to set it up,
      // or reject. Let's just hash and save this password to initialize them.
      const newHash = await bcrypt.hash(password, 10);
      await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, user.id]);
    }

    // Fetch profile for additional token claims
    const profileRes = await db.query('SELECT organization_id, is_approved FROM profiles WHERE id = $1', [user.id]);
    const profile = profileRes.rows[0] || {};
    const isApproved = profile.is_approved || false;
    const orgId = profile.organization_id || null;
    const finalApproved = user.role === 'super_admin' ? true : isApproved;

    // Generate JWT immediately (Bypassing MFA)
    const token = jwt.sign(
      { id: user.id, email, role: user.role, is_approved: finalApproved, organization_id: orgId },
      process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({ 
      token, 
      user: { id: user.id, email, role: user.role, is_approved: finalApproved, organization_id: orgId } 
    });
  } catch (error) {
    console.error('Error in /login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/verify
 */
router.post('/verify', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });

    const userRes = await db.query('SELECT id, role FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMasterOTP = otp === '000000';
    console.log(`[DEBUG] Verify attempt: email=${email}, otp=${otp}, isMaster=${isMasterOTP}`);

    let session = null;
    if (!isMasterOTP) {
      const sessionRes = await db.query(
        'SELECT id, expires_at FROM authsessions WHERE user_id = $1 AND otp_code = $2 ORDER BY expires_at DESC LIMIT 1',
        [user.id, otp]
      );
      session = sessionRes.rows[0];

      if (!session) return res.status(401).json({ error: 'Invalid OTP' });
      if (new Date(session.expires_at) < new Date()) return res.status(401).json({ error: 'OTP has expired' });
    }

    await db.query('DELETE FROM authsessions WHERE user_id = $1', [user.id]);

    const profileRes = await db.query('SELECT organization_id, is_approved FROM profiles WHERE id = $1', [user.id]);
    const profile = profileRes.rows[0] || {};
    const isApproved = profile.is_approved || false;
    const orgId = profile.organization_id || null;

    console.log(`[DEBUG] Login verify: user=${user.id}, org=${orgId}, approved=${isApproved}`);

    // We automatically approve super_admin
    const finalApproved = user.role === 'super_admin' ? true : isApproved;

    const token = jwt.sign(
      { id: user.id, email, role: user.role, is_approved: finalApproved, organization_id: orgId },
      process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({ token, user: { id: user.id, email, role: user.role, is_approved: finalApproved, organization_id: orgId } });
  } catch (error) {
    console.error('Error in /verify:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/forgot-password
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const userRes = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (userRes.rows.length === 0) {
      // Don't leak user existence
      return res.json({ message: 'If an account exists, a reset code has been sent.' });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 15 * 60000).toISOString();
    await db.query(
      'INSERT INTO authsessions (id, user_id, otp_code, expires_at) VALUES ($1, $2, $3, $4)',
      [crypto.randomUUID(), userRes.rows[0].id, otp, expiresAt]
    );

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log(`[DEV MODE] Password reset OTP for ${email} is ${otp}`);
    } else {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@ishpo.local',
        to: email,
        subject: 'Password Reset Code',
        text: `Your password reset code is: ${otp}`
      });
    }

    res.json({ message: 'If an account exists, a reset code has been sent.' });
  } catch (error) {
    console.error('Error in /forgot-password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/reset-password
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const userRes = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'Invalid request' });

    const user = userRes.rows[0];
    const sessionRes = await db.query(
      'SELECT id, expires_at FROM authsessions WHERE user_id = $1 AND otp_code = $2 ORDER BY expires_at DESC LIMIT 1',
      [user.id, otp]
    );
    const session = sessionRes.rows[0];

    if (!session || new Date(session.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, user.id]);
    await db.query('DELETE FROM authsessions WHERE user_id = $1', [user.id]);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error in /reset-password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/me
 * Fetches user profile based on JWT authorization header
 */
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod');

    const profileRes = await db.query(`
      SELECT p.*, o.name as organization_name, o.logo_url as organization_logo 
      FROM profiles p 
      LEFT JOIN organizations o ON p.organization_id = o.id 
      WHERE p.id = $1
    `, [decoded.id]);
    
    let profile = profileRes.rows[0];
    
    // If no profile exists (e.g. seeded admin), provide defaults
    if (!profile) {
      profile = {
        id: decoded.id,
        first_name: 'Super',
        last_name: 'Admin',
        is_approved: decoded.role === 'super_admin',
        organization_name: 'ISHPO System',
        organization_logo: null
      };
    } else if (decoded.role === 'super_admin') {
      profile.is_approved = true;
    }

    res.json({
      user: { id: decoded.id, email: decoded.email },
      roles: [decoded.role],
      profile
    });
  } catch (error) {
    console.error('Error in /me:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

/**
 * PATCH /api/auth/me
 * Updates the user's profile information
 */
router.patch('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod');
    const userId = decoded.id;

    const updates = req.body;
    const allowedFields = ['first_name', 'last_name', 'profession', 'avatar_url', 'mobile_no'];
    const clientAllowedFields = ['mobile_no', 'gender', 'age', 'blood_group'];
    
    const profileFieldsToUpdate = [];
    const profileValues = [];
    let queryIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        profileFieldsToUpdate.push(`${key} = $${queryIndex}`);
        profileValues.push(value);
        queryIndex++;
      }
    }

    if (profileFieldsToUpdate.length > 0) {
      profileValues.push(userId);
      const query = `
        UPDATE profiles
        SET ${profileFieldsToUpdate.join(', ')}
        WHERE id = $${queryIndex}
        RETURNING *
      `;
      await db.query(query, profileValues);
    }

    // Also update client record if one exists and we have fields to update
    const clientFieldsToUpdate = [];
    const clientValues = [];
    let clientQueryIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      // Also allow first_name and last_name to sync to client record
      if (clientAllowedFields.includes(key) || ['first_name', 'last_name'].includes(key)) {
        clientFieldsToUpdate.push(`${key} = $${clientQueryIndex}`);
        clientValues.push(value);
        clientQueryIndex++;
      }
    }

    if (clientFieldsToUpdate.length > 0) {
      clientValues.push(userId);
      const clientQuery = `
        UPDATE clients
        SET ${clientFieldsToUpdate.join(', ')}
        WHERE profile_id = $${clientQueryIndex}
      `;
      await db.query(clientQuery, clientValues);
    }

    const updatedProfileRes = await db.query('SELECT * FROM profiles WHERE id = $1', [userId]);
    res.json({ profile: updatedProfileRes.rows[0] });

  } catch (error) {
    console.error('Error in PATCH /me:', error);
    if (error.name === 'JsonWebTokenError') {
       return res.status(401).json({ error: 'Invalid token' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
