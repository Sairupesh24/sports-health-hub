import pg from 'pg';
import bcrypt from 'bcrypt';

const { Pool } = pg;
const pool = new Pool({
  host: 'localhost',
  port: 5434,
  user: 'skavuturi',
  password: 'Ksr24rupesh',
  database: 'ishpo',
});

async function run() {
  try {
    const passwordHash = await bcrypt.hash('password123', 10);
    
    // Update all users to password123
    const res = await pool.query(
      'UPDATE users SET password_hash = $1 RETURNING email',
      [passwordHash]
    );
    
    console.log('Successfully updated passwords for:', res.rows.map(r => r.email));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
