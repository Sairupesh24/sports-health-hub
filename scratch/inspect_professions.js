import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://skavuturi:Ksr24rupesh@localhost:5434/ishpo',
});

async function run() {
  try {
    const res = await pool.query('SELECT DISTINCT profession, ams_role FROM profiles');
    console.log('--- Unique Professions and ams_role ---');
    console.log(res.rows);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}

run();
