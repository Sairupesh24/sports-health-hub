const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://skavuturi:Ksr24rupesh@localhost:5434/ishpo' });

async function run() {
    try {
        // Check columns in clients
        const clientCols = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'clients'
            ORDER BY ordinal_position
        `);
        console.log('clients columns:', clientCols.rows.map(r => r.column_name).join(', '));

        // Check columns in profiles
        const profileCols = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'profiles'
            ORDER BY ordinal_position
        `);
        console.log('profiles columns:', profileCols.rows.map(r => r.column_name).join(', '));

        // Check columns in program_assignments
        const paCols = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'program_assignments'
            ORDER BY ordinal_position
        `);
        console.log('program_assignments columns:', paCols.rows.map(r => r.column_name).join(', '));

        // Check columns in liftitems
        const liCols = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'liftitems'
            ORDER BY ordinal_position
        `);
        console.log('liftitems columns:', liCols.rows.map(r => r.column_name).join(', '));

        // Check columns in sessions
        const sessionCols = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'sessions'
            ORDER BY ordinal_position
        `);
        console.log('sessions columns:', sessionCols.rows.map(r => r.column_name).join(', '));

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

run();
