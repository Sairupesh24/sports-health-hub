const { db } = require('../server/db.js');

async function main() {
    try {
        console.log('=== PROFILES ===');
        const profilesRes = await db.query('SELECT * FROM profiles LIMIT 5');
        console.table(profilesRes.rows);

        console.log('\n=== CLIENTS ===');
        const clientsRes = await db.query('SELECT * FROM clients LIMIT 5');
        console.table(clientsRes.rows);

        console.log('\n=== SESSIONS ===');
        const sessionsRes = await db.query(`
            SELECT id, client_id, therapist_id, scientist_id, scheduled_start, status, service_type
            FROM sessions
            ORDER BY scheduled_start ASC
            LIMIT 20
        `);
        console.table(sessionsRes.rows);
    } catch (err) {
        console.error('Error querying DB:', err);
    } finally {
        process.exit(0);
    }
}

main();
