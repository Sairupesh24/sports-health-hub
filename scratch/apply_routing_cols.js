import pool from '../server/db.js';

async function applyMissingColumns() {
  console.log("Applying missing columns to Sessions table...");
  try {
    await pool.query(`ALTER TABLE Sessions ADD COLUMN IF NOT EXISTS preference_type TEXT DEFAULT 'Strict';`);
    await pool.query(`ALTER TABLE Sessions ADD COLUMN IF NOT EXISTS is_flexible_routing BOOLEAN DEFAULT false;`);
    console.log("Success: preference_type and is_flexible_routing columns added.");
  } catch (err) {
    console.error("Error applying columns:", err.message);
  } finally {
    process.exit();
  }
}

applyMissingColumns();
