import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  host: 'localhost',
  port: 5434,
  user: 'skavuturi',
  password: 'Ksr24rupesh',
  database: 'ishpo',
});

async function check() {
  try {
    const res = await pool.query('SELECT email, password_hash, role FROM users');
    console.log('--- USERS ---');
    res.rows.forEach(u => {
      console.log(`Email: ${u.email} | Role: ${u.role} | Has Password: ${!!u.password_hash}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
check();
