const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://skavuturi:Ksr24rupesh@localhost:5434/ishpo' });

async function run() {
    try {
        const res = await pool.query(`
            SELECT conname, contype, pg_get_constraintdef(oid) as def
            FROM pg_constraint 
            WHERE conrelid = 'batch_members'::regclass
        `);
        console.log('Constraints on batch_members:', res.rows);

        const countMissing = await pool.query(`
            SELECT COUNT(*) FROM batch_members bm
            WHERE bm.athlete_id IS NOT NULL 
              AND NOT EXISTS (SELECT 1 FROM clients c WHERE c.id = bm.athlete_id)
        `);
        console.log('batch_members athlete_id not in clients count:', countMissing.rows[0]);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

run();
