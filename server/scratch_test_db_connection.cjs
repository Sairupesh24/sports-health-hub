const pg = require('pg');
const { Pool } = pg;

const credentialsList = [
    { user: 'skavuturi', password: 'Ksr24rupesh', database: 'ishpo' },
    { user: 'postgres', password: 'postgres', database: 'postgres' },
    { user: 'postgres', password: 'password', database: 'postgres' },
    { user: 'postgres', password: 'admin', database: 'postgres' },
    { user: 'postgres', password: 'Ksr24rupesh', database: 'postgres' },
    { user: 'postgres', password: '', database: 'postgres' }
];

async function tryConnect() {
    for (const cred of credentialsList) {
        console.log(`Trying connection for user "${cred.user}"...`);
        const pool = new Pool({
            host: 'localhost',
            port: 5433,
            user: cred.user,
            password: cred.password,
            database: cred.database,
            connectionTimeoutMillis: 2000
        });
        try {
            const client = await pool.connect();
            console.log(`\n🎉 SUCCESS! Connected with user: ${cred.user}, password: ${cred.password}, database: ${cred.database}`);
            const res = await client.query('SELECT current_database(), current_user');
            console.log('QueryResult:', res.rows[0]);
            client.release();
            await pool.end();
            return;
        } catch (e) {
            console.log(`Failed: ${e.message.split('\n')[0]}`);
        }
        await pool.end();
    }
    console.log('\n❌ None of the credentials succeeded.');
}

tryConnect();
