import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

// Load config matching server/db.js
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
        console.log("Connecting to PostgreSQL database...");
        const res = await pool.query("SELECT * FROM information_schema.tables WHERE table_name = 'client_soreness_reports';");
        
        if (res.rows.length > 0) {
            console.log("\n[OK] client_soreness_reports table exists in database.");
            
            // Insert mock record
            const mockStaffId = '1e4d0d00-47cb-4b44-934c-62b14421b44b';
            const mockOrgId = 'f12b6dfd-29bc-4340-9a3d-1a852cbcf930';
            const mockUhid = 'TEST-UHID-999';
            
            console.log("Attempting insertion of mock soreness report...");
            const insertRes = await pool.query(`
                INSERT INTO client_soreness_reports (
                    organization_id, client_uhid, assigned_by_staff_id, soreness_data, global_clinical_interpretation
                ) VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `, [
                mockOrgId,
                mockUhid,
                mockStaffId,
                JSON.stringify([
                    { region: "knee_left", soreness_score: 8, regional_comment: "High sensitivity" },
                    { region: "lumbar_spine", soreness_score: 4, regional_comment: "Mild stiffness" }
                ]),
                'Progressive load is recommended.'
            ]);
            console.log("[OK] Inserted mock record successfully:");
            console.log(insertRes.rows[0]);

            // Query back the record
            console.log("Attempting retrieval of inserted report...");
            const selectRes = await pool.query("SELECT * FROM client_soreness_reports WHERE client_uhid = $1;", [mockUhid]);
            console.log(`[OK] Retrieved ${selectRes.rows.length} record(s).`);
            
            // Clean up
            console.log("Cleaning up mock record...");
            await pool.query("DELETE FROM client_soreness_reports WHERE client_uhid = $1;", [mockUhid]);
            console.log("[OK] Database verification completed successfully!");
        } else {
            console.log("\n[ERROR] client_soreness_reports table NOT found in database. Check server boot or db.js initialization.");
        }
    } catch (err) {
        console.error("\n[FAILED] Database Test Exception occurred:", err);
    } finally {
        await pool.end();
    }
}

run();
