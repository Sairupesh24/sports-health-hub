import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5434/sports_physio'
});

async function run() {
    try {
        console.log("Querying sessions...");
        const sessionsRes = await pool.query(`
            SELECT id, client_id, therapist_id, service_id, scheduled_start, scheduled_end, status 
            FROM sessions 
            WHERE scheduled_start::date = '2026-05-27'
        `);
        console.log("SESSIONS ON 2026-05-27:");
        console.log(sessionsRes.rows);

        console.log("\nQuerying clinical profiles...");
        const profilesRes = await pool.query(`
            SELECT p.id, p.first_name, p.last_name, p.profession, u.role 
            FROM profiles p
            JOIN users u ON p.id = u.id
            WHERE u.role IN ('consultant', 'sports_physician', 'physiotherapist', 'nutritionist', 'sports_scientist', 'massage_therapist')
        `);
        console.log("CLINICAL PROFILES:");
        console.log(profilesRes.rows);

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

run();
