import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : new Pool({
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT || '5434', 10),
      user: process.env.PGUSER || 'skavuturi',
      password: process.env.PGPASSWORD || 'Ksr24rupesh',
      database: process.env.PGDATABASE || 'ishpo',
    });
async function run() {
  try {
    console.log('Using DB config:', process.env.DATABASE_URL ? 'DATABASE_URL' : 'localhost:5434');
    
    const res = await pool.query(`
        SELECT s.id, s.therapist_id, s.scheduled_start, s.scheduled_end, p.first_name, p.last_name 
        FROM sessions s
        LEFT JOIN profiles p ON s.therapist_id = p.id
    `);
    console.log('--- ALL SESSIONS ---', res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
