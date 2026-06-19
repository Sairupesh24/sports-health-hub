import { PrismaClient } from '../generated/prisma/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://skavuturi:Ksr24rupesh@localhost:5434/ishpo?schema=public';
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  console.log('--- Testing Prisma Client Query capability ---');
  
  // Test query on User table
  console.log('Querying first 3 users...');
  const users = await prisma.user.findMany({
    take: 3,
    include: {
      profiles: true,
    },
  });

  console.log('Users found inside database:');
  console.log(JSON.stringify(users, null, 2));

  // Test query on Profile table directly
  console.log('\nQuerying first 3 profiles...');
  const profiles = await prisma.profile.findMany({
    take: 3,
  });
  console.log('Profiles found inside database:');
  console.log(JSON.stringify(profiles, null, 2));
  
  console.log('\n🎉 Prisma validation script completed successfully!');
}

main()
  .catch(err => {
    console.error('❌ Connection or query failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
