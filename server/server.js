import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './auth.js';
import { requireAuth } from './middleware.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Used for dev, but Nginx proxy will bypass CORS anyway
app.use(express.json());

// Auth Routes
app.use('/api/auth', authRoutes);

// Sample Protected Route
app.get('/api/patients', requireAuth, (req, res) => {
  // In a real application, you would query the database here.
  // For demonstration, we'll return mock data.
  res.json({
    message: \`Welcome \${req.user.email}! Here is the patient data.\`,
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

// Error handling for SQLite locked errors or generic issues
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  if (err.message && err.message.includes('database is locked')) {
    return res.status(503).json({ error: 'Database is temporarily busy. Please try again.' });
  }
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(\`[SERVER] Running on http://localhost:\${PORT}\`);
});
