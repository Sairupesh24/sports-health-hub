import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5434', 10),
  user: process.env.PGUSER || 'skavuturi',
  password: process.env.PGPASSWORD || 'Ksr24rupesh',
  database: process.env.PGDATABASE || 'ishpo',
});

async function test() {
  try {
    const res = await pool.query('SELECT version()');
    console.log('Connected to:', res.rows[0].version);
    
    // Now trigger the full initialization by importing server/db.js
    // We use dynamic import because it's an ES module
    console.log('Initializing database schema...');
    await import('./server/db.js');
    console.log('Initialization complete.');
    process.exit(0);
  } catch (err) {
    console.error('Connection failed:', err);
    process.exit(1);
  }
}

test();
