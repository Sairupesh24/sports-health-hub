const { Client } = require('pg');

async function test() {
    const projectRef = 'fbjlgepxbyoyradaacvd';
    const password = 'password123'; // Guessing
    const connectionString = `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`;
    
    console.log(`Testing connection to ${projectRef} with guessed password...`);
    const client = new Client({ connectionString });
    
    try {
        await client.connect();
        console.log('✅ Connection successful!');
        const res = await client.query('SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = \'public\'');
        console.log('Tables:', res.rows.map(r => r.tablename));
        await client.end();
    } catch (err) {
        console.log('❌ Connection failed:', err.message);
    }
}

test();
