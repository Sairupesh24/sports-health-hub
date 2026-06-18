const { db } = require('../server/db.js');

async function main() {
    try {
        console.log('=== PROFILES ===');
        const profilesRes = await db.query('SELECT id, first_name, last_name, profession FROM profiles');
        console.table(profilesRes.rows);
    } catch (err) {
        console.error('Error querying DB:', err);
    } finally {
        process.exit(0);
    }
}

main();
