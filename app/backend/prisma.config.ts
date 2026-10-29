import 'dotenv/config';
import { defineConfig } from 'prisma/config';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL non definita in .env');

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { seed: 'node prisma/seed.js' },
  datasource: { url: process.env.DATABASE_URL },
});
