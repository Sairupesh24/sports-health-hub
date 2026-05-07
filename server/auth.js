import express from 'express';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from './db.js';

const router = express.Router();

// Configure Nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.email.ap-mumbai-1.oci.oraclecloud.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Helper to generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * POST /api/auth/request-login
 * Accepts { email }
 * Generates OTP, stores it, and sends via email.
 */
router.post('/request-login', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists, if not, you might want to create them or reject.
    // For this example, we'll create a new user if they don't exist (assuming public registration).
    let user = db.prepare('SELECT id FROM Users WHERE email = ?').get(email);
    if (!user) {
      const userId = crypto.randomUUID();
      db.prepare('INSERT INTO Users (id, email) VALUES (?, ?)').run(userId, email);
      user = { id: userId };
    }

    const otp = generateOTP();
    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || '15', 10);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60000).toISOString();
    const sessionId = crypto.randomUUID();

    // Store OTP in database
    db.prepare(`
      INSERT INTO AuthSessions (id, user_id, otp_code, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(sessionId, user.id, otp, expiresAt);

    // Send email
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@ishpo.local',
      to: email,
      subject: 'Your ISHPO Login Code',
      text: \`Your login code is: \${otp}\\nIt will expire in \${expiryMinutes} minutes.\`,
      html: \`<p>Your login code is: <strong>\${otp}</strong></p><p>It will expire in \${expiryMinutes} minutes.</p>\`
    };

    // If SMTP credentials aren't fully set up locally, just log the OTP for testing
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log(\`[DEV MODE] OTP for \${email} is \${otp}\`);
    } else {
      await transporter.sendMail(mailOptions);
    }

    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Error in /request-login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/verify
 * Accepts { email, otp }
 * Verifies OTP and returns JWT
 */
router.post('/verify', (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const user = db.prepare('SELECT id, role FROM Users WHERE email = ?').get(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find valid OTP session
    const session = db.prepare(\`
      SELECT id, expires_at FROM AuthSessions 
      WHERE user_id = ? AND otp_code = ?
      ORDER BY expires_at DESC LIMIT 1
    \`).get(user.id, otp);

    if (!session) {
      return res.status(401).json({ error: 'Invalid OTP' });
    }

    if (new Date(session.expires_at) < new Date()) {
      return res.status(401).json({ error: 'OTP has expired' });
    }

    // Delete used OTP (and any older ones for this user to clean up)
    db.prepare('DELETE FROM AuthSessions WHERE user_id = ?').run(user.id);

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({ token, user: { id: user.id, email, role: user.role } });
  } catch (error) {
    console.error('Error in /verify:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
