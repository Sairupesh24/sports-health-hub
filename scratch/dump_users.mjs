import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  host: 'localhost',
  port: 5434,
  user: 'skavuturi',
  password: 'Ksr24rupesh',
  database: 'ishpo',
});

async function dump() {
  try {
    const res = await pool.query('SELECT email, role FROM users');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
dump();
