import pg from 'pg';
import 'dotenv/config';

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
    const subs = await pool.query('SELECT * FROM subscriptions');
    console.log('--- Subscriptions ---');
    console.log(subs.rows);

    const bills = await pool.query('SELECT * FROM bills');
    console.log('--- Bills ---');
    console.log(bills.rows);

    const billitems = await pool.query('SELECT * FROM billitems');
    console.log('--- Bill Items ---');
    console.log(billitems.rows);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}

run();
