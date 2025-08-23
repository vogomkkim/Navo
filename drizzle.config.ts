import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	schema: './navo/db/schema.ts',
	out: './drizzle',
	dialect: 'postgresql',
	dbCredentials: {
		connectionString: process.env.DATABASE_URL ?? '',
	},
	verbose: true,
	strict: true,
});
