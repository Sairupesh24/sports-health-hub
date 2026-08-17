import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5434', 10),
  user: process.env.PGUSER || 'skavuturi',
  password: process.env.PGPASSWORD || 'Ksr24rupesh',
  database: process.env.PGDATABASE || 'ishpo',
});

async function main() {
  try {
    const res = await pool.query(`
      SELECT p.id, p.first_name, p.last_name, p.profession, u.email, u.role, p.is_approved
      FROM profiles p
      LEFT JOIN users u ON p.id = u.id
      WHERE u.role NOT IN ('client', 'athlete') OR u.role IS NULL
      ORDER BY p.first_name ASC
    `);
    console.log("ALL NON-CLIENT USERS & EMPLOYEES:");
    console.log(JSON.stringify(res.rows, null, 2));

    const hrRes = await pool.query(`
      SELECT e.*, p.first_name, p.last_name, p.profession
      FROM hr_employees e
      LEFT JOIN profiles p ON e.profile_id = p.id
    `);
    console.log("HR EMPLOYEES TABLE:");
    console.log(JSON.stringify(hrRes.rows, null, 2));
  } catch (err) {
    console.error("DB Query error:", err.message);
  } finally {
    await pool.end();
  }
}

main();
