import pg from 'pg';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const { Pool } = pg;
const pool = new Pool({
  host: 'localhost',
  port: 5434,
  user: 'skavuturi',
  password: 'Ksr24rupesh',
  database: 'ishpo',
});

const testData = [
  {
    "Email": "admin@ishpo.local",
    "Name": "Super Admin",
    "Role": "super_admin",
    "Org": "ISHPO Headquarters"
  }
];

async function seed() {
  try {
    console.log('Cleaning up database...');
    // Truncate all main tables
    await pool.query('TRUNCATE users, profiles, organizations, clients, sessions, cliententitlements, bills, billitems, services, packages CASCADE');

    const passwordHash = await bcrypt.hash('password123', 10);
    const orgMap = {};

    console.log('Seeding data...');

    for (const item of testData) {
      // 1. Handle Organization
      if (!orgMap[item.Org]) {
        const orgCode = Math.floor(100000 + Math.random() * 900000).toString();
        const orgRes = await pool.query(
          'INSERT INTO organizations (name, org_code, status) VALUES ($1, $2, $3) RETURNING id',
          [item.Org, orgCode, 'active']
        );
        orgMap[item.Org] = orgRes.rows[0].id;
        console.log(`Created Org: ${item.Org} (Code: ${orgCode})`);
      }

      // 2. Create User
      const userId = crypto.randomUUID();
      await pool.query(
        'INSERT INTO users (id, email, password_hash, role) VALUES ($1, $2, $3, $4)',
        [userId, item.Email.toLowerCase(), passwordHash, item.Role]
      );

      // 3. Create Profile
      const names = item.Name.split(' ');
      const firstName = names[0];
      const lastName = names.slice(1).join(' ') || 'User';
      
      await pool.query(
        'INSERT INTO profiles (id, first_name, last_name, organization_id, is_approved) VALUES ($1, $2, $3, $4, $5)',
        [userId, firstName, lastName, orgMap[item.Org], true]
      );

      console.log(`Created User: ${item.Email} (${item.Role})`);
    }

    console.log('\n✅ Seeding complete!');
    console.log('Default Password for all accounts: password123');
    
  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    await pool.end();
  }
}

seed();
