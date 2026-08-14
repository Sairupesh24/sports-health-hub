import { db } from '../server/db.js';

async function inspect() {
    try {
        const res = await db.query(`
            SELECT s.id, s.scheduled_start, s.scheduled_end, s.status, s.therapist_id, s.scientist_id, s.client_id,
                   c.first_name, c.last_name, p.first_name as prof_first, p.last_name as prof_last
            FROM Sessions s
            LEFT JOIN Clients c ON s.client_id = c.id
            LEFT JOIN profiles p ON COALESCE(s.therapist_id, s.scientist_id) = p.id
            WHERE s.scheduled_start >= '2026-08-14 00:00:00' AND s.scheduled_start <= '2026-08-14 23:59:59'
            ORDER BY s.scheduled_start ASC;
        `);
        console.log("AUGUST 14 SESSIONS IN DB:", JSON.stringify(res.rows, null, 2));

        const waitlistRes = await db.query(`
            SELECT w.*, c.first_name, c.last_name, p.first_name as prof_first, p.last_name as prof_last
            FROM waitlist w
            LEFT JOIN Clients c ON w.client_id = c.id
            LEFT JOIN profiles p ON w.therapist_id = p.id
            WHERE w.preferred_date = '2026-08-14';
        `);
        console.log("AUGUST 14 WAITLIST IN DB:", JSON.stringify(waitlistRes.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

inspect();
