import pg from 'pg';
const { Pool } = pg;

const config = {
  host: 'localhost',
  port: 5433,
  user: 'skavuturi',
  password: 'Ksr24rupesh',
  database: 'ishpo',
};

console.log('Connecting with config:', JSON.stringify(config, null, 2));

const pool = new Pool(config);

try {
  const res = await pool.query('SELECT current_user, current_database()');
  console.log('SUCCESS:', res.rows[0]);
} catch (err) {
  console.error('FAILED:', err.message);
  console.error('Code:', err.code);
}
await pool.end();
