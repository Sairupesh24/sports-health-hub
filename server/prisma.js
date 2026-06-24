import { PrismaClient } from '../generated/prisma/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
const pool = connectionString
  ? new pg.Pool({ connectionString })
  : new pg.Pool({
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT || '5434', 10),
      user: process.env.PGUSER || 'skavuturi',
      password: process.env.PGPASSWORD || 'Ksr24rupesh',
      database: process.env.PGDATABASE || 'ishpo',
    });

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
});
