import pg from 'pg';

const db = new pg.Pool({
    user: 'skavuturi',
    host: 'localhost',
    database: 'ishpo',
    password: 'Ksr24rupesh',
    port: 5434,
});

async function checkSchema() {
    const tables = ['Bills', 'ClientDocuments', 'Clients', 'HrAttendanceLogs'];
    for (const table of tables) {
        console.log(`\n--- Schema for ${table} ---`);
        try {
            const res = await db.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE LOWER(table_name) = LOWER($1)
            `, [table]);
            if (res.rows.length === 0) {
                console.log(`Table ${table} not found or has no columns.`);
            } else {
                res.rows.forEach(row => console.log(`${row.column_name}: ${row.data_type}`));
            }
        } catch (err) {
            console.error(`Error checking ${table}:`, err.message);
        }
    }
    await db.end();
}

checkSchema();
