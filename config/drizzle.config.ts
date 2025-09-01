import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// .env 파일 로드
dotenv.config({ path: './.env' });

export default defineConfig({
  schema: './navo/db/schema.ts',
  out: './drizzle',
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
