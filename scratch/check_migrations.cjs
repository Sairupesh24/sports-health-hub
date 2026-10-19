const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: 'postgresql://skavuturi:Ksr24rupesh@localhost:5434/ishpo' });

async function run() {
    try {
        const migrationsDir = path.join(__dirname, '..', 'prisma', 'migrations');
        const diskMigrations = fs.readdirSync(migrationsDir).filter(f => fs.statSync(path.join(migrationsDir, f)).isDirectory());

        const res = await pool.query('SELECT id, migration_name, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY migration_name ASC');
        const dbMigrations = res.rows;

        console.log(`Disk migrations count: ${diskMigrations.length}`);
        console.log(`DB migrations count: ${dbMigrations.length}`);

        const dbSet = new Set(dbMigrations.map(m => m.migration_name));
        const diskSet = new Set(diskMigrations);

        const notInDb = diskMigrations.filter(m => !dbSet.has(m));
        const notOnDisk = dbMigrations.filter(m => !diskSet.has(m.migration_name));

        console.log('Migrations on disk not in DB:', notInDb);
        console.log('Migrations in DB not on disk:', notOnDisk);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

run();
