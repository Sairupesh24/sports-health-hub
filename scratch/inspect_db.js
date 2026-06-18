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
    console.log('--- Connecting to DB ---');
    
    // Check indexes
    const indexQuery = `
      SELECT
          tablename,
          indexname,
          indexdef
      FROM
          pg_indexes
      WHERE
          tablename = 'injury_master_data';
    `;
    const indexRes = await pool.query(indexQuery);
    console.log('Indexes on injury_master_data:');
    console.log(JSON.stringify(indexRes.rows, null, 2));

    // Check constraints
    const constraintQuery = `
      SELECT
          conname,
          pg_get_constraintdef(oid)
      FROM
          pg_constraint
      WHERE
          conrelid = 'injury_master_data'::regclass;
    `;
    const constraintRes = await pool.query(constraintQuery);
    console.log('\nConstraints on injury_master_data:');
    console.log(JSON.stringify(constraintRes.rows, null, 2));

  } catch (error) {
    console.error('Error run inspect_db.js:', error);
  } finally {
    await pool.end();
  }
}

main();
