import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DB_PATH || path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

// Optimize SQLite for performance
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('temp_store = MEMORY');

function initializeDatabase() {
  // Create Users table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS Users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Create AuthSessions table for OTP
  db.prepare(`
    CREATE TABLE IF NOT EXISTS AuthSessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      otp_code TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    )
  `).run();

  // Seed super admin
  seedSuperAdmin();
}

function seedSuperAdmin() {
  const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@ishpo.local';
  
  const existingAdmin = db.prepare('SELECT id FROM Users WHERE email = ?').get(adminEmail);
  
  if (!existingAdmin) {
    const adminId = crypto.randomUUID();
    db.prepare('INSERT INTO Users (id, email, role) VALUES (?, ?, ?)').run(adminId, adminEmail, 'super_admin');
    console.log(`[DB] Seeded super admin user with email: ${adminEmail}`);
  } else {
    // Ensure role is super_admin
    db.prepare('UPDATE Users SET role = ? WHERE email = ?').run('super_admin', adminEmail);
  }
}

// Run initialization
initializeDatabase();

export default db;
