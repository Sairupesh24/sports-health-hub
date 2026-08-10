import { defineConfig } from '@prisma/config';
import 'dotenv/config';

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL || "postgresql://skavuturi:Ksr24rupesh@localhost:5434/ishpo",
  },
});
