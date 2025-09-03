import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './server/drizzle/schema.ts',
  out: './server/drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432'),
    user: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'navo',
  },
  verbose: true,
  strict: true,
});
