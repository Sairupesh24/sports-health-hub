import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  host: 'localhost',
  port: 5434,
  user: 'skavuturi',
  password: 'Ksr24rupesh',
  database: 'ishpo',
});

const res = await pool.query("SELECT p.*, u.role FROM profiles p JOIN users u ON p.id = u.id WHERE u.email = 'sandeeps@ishpo.com'");
console.log(JSON.stringify(res.rows[0], null, 2));
await pool.end();
