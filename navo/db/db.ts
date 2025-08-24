import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.js';
import logger from '../core/logger.js';

const connectionString = process.env.DATABASE_URL ?? '';

export const client = postgres(connectionString, { prepare: true });
export const db = drizzle(client, { schema });

export async function testConnection(): Promise<void> {
	try {
		await client`select 1`;
		logger.info('[DB] Database connection successful');
	} catch (error) {
		logger.error('[DB] Database connection failed', error);
		throw error;
	}
}

export async function disconnect(): Promise<void> {
	await client.end({ timeout: 5 });
	logger.info('[DB] Database connection closed');
}

process.on('beforeExit', async () => {
	await disconnect();
});
