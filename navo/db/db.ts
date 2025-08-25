import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.js';
import logger from '../core/logger.js';

const connectionString = process.env.DATABASE_URL ?? '';

// 연결 정보 로깅 (민감한 정보는 마스킹)
function logConnectionInfo() {
  if (!connectionString) {
    logger.error('DATABASE_URL environment variable is not set');
    return;
  }

  logger.info('Connecting to database...');
}

// 연결 시도 전 로깅
logConnectionInfo();

// 연결 문자열 검증
if (!connectionString) {
  logger.error('Cannot create database client: DATABASE_URL is empty');
  throw new Error('DATABASE_URL environment variable is required');
}

let client: postgres.Sql;
try {
  client = postgres(connectionString, {
    prepare: true,
    onnotice: (notice) => logger.debug('PostgreSQL Notice:', notice),
    onparameter: (param) => {
      // Only log important parameters, not all of them
      if (
        typeof param === 'string' &&
        (param.includes('server_version') || param.includes('client_encoding'))
      ) {
        logger.debug('PostgreSQL Parameter:', param);
      }
    },
    onclose: () => logger.info('Database connection closed'),
    ssl: 'require',
  });
  logger.info('Database client created');
} catch (error) {
  logger.error('Failed to create database client', {
    error: error instanceof Error ? error.message : String(error),
  });
  throw error;
}

export { client };
export const db = drizzle(client, { schema });

export async function testConnection(): Promise<void> {
  try {
    await client`select 1`;
    logger.info('Database connection successful');
  } catch (error) {
    logger.error('Database connection failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function disconnect(): Promise<void> {
  await client.end({ timeout: 5 });
  logger.info('Database connection closed');
}

process.on('beforeExit', async () => {
  await disconnect();
});
