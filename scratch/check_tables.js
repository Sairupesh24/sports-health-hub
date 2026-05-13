import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: "postgresql://postgres:postgres@localhost:5432/ishpomigration"
});

async function checkTables() {
  try {
    await client.connect();
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log(res.rows.map(r => r.table_name));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkTables();
