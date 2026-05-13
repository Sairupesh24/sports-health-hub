import { db } from '../server/db.js';

async function run() {
  const res = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
  console.log(res.rows.map(r => r.table_name));

  const pCols = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='profiles'");
  console.log("profiles:", pCols.rows);

  const sCols = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='services'");
  console.log("services:", sCols.rows);

  process.exit(0);
}
run();
