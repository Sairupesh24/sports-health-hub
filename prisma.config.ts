import { defineConfig } from '@prisma/config';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load both root .env and server/.env
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, 'server', '.env') });

const defaultPort = process.env.PGPORT || (process.platform === 'win32' ? '5434' : '5432');
const defaultUser = process.env.PGUSER || 'skavuturi';
const defaultPass = process.env.PGPASSWORD || 'Ksr24rupesh';
const defaultHost = process.env.PGHOST || 'localhost';
const defaultDb = process.env.PGDATABASE || 'ishpo';

const fallbackUrl = `postgresql://${defaultUser}:${defaultPass}@${defaultHost}:${defaultPort}/${defaultDb}`;

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL || fallbackUrl,
  },
});
