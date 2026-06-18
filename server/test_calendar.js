import pg from 'pg';

const pool = new pg.Pool({
    host: 'localhost',
    port: 5434,
    user: 'skavuturi',
    password: 'Ksr24rupesh',
    database: 'ishpo'
});

async function run() {
    try {
        console.log("Querying organizations...");
        const orgs = await pool.query("SELECT id, name FROM organizations");
        console.log("Orgs:", orgs.rows);
        
        console.log("Querying sessions with left joins...");
        const res = await pool.query(`
            SELECT s.id, s.therapist_id, s.scheduled_start, s.scheduled_end, s.status,
                   p.first_name, p.last_name
            FROM sessions s
            LEFT JOIN profiles p ON s.therapist_id = p.id
            WHERE s.scheduled_start >= '2026-06-04 00:00:00+00' AND s.scheduled_start <= '2026-06-06 00:00:00+00'
        `);
        console.log("Sessions with therapist info:", res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

run();






