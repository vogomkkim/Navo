import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.js';
import logger from '../core/logger.js';

const connectionString = process.env.DATABASE_URL ?? '';

// 연결 정보 로깅 (민감한 정보는 마스킹)
function logConnectionInfo() {
  if (!connectionString) {
    logger.error('[DB] DATABASE_URL environment variable is not set');
    return;
  }

  logger.info('[DB] Attempting database connection', connectionString);
}

// 연결 시도 전 로깅
logConnectionInfo();

// 연결 문자열 검증
if (!connectionString) {
  logger.error('[DB] Cannot create database client: DATABASE_URL is empty');
  throw new Error('DATABASE_URL environment variable is required');
}

let client: postgres.Sql;
try {
  client = postgres(connectionString, {
    prepare: true,
    onnotice: (notice) => logger.debug('[DB] PostgreSQL Notice:', notice),
    onparameter: (param) => logger.debug('[DB] PostgreSQL Parameter:', param),
    onclose: () => logger.info('[DB] PostgreSQL connection closed'),
  });
  logger.info('[DB] PostgreSQL client created successfully');
} catch (error) {
  logger.error('[DB] Failed to create PostgreSQL client', {
    error: error instanceof Error ? error.message : String(error),
    connectionString: connectionString.substring(0, 50) + '...',
  });
  throw error;
}

export { client };
export const db = drizzle(client, { schema });

export async function testConnection(): Promise<void> {
  try {
    logger.info('[DB] Testing database connection...');
    await client`select 1`;
    logger.info('[DB] Database connection successful');
  } catch (error) {
    logger.error('[DB] Database connection failed', {
      error: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code,
      detail: (error as any)?.detail,
      hint: (error as any)?.hint,
      where: (error as any)?.where,
      schema: (error as any)?.schema,
      table: (error as any)?.table,
      column: (error as any)?.column,
      dataType: (error as any)?.dataType,
      constraint: (error as any)?.constraint,
      file: (error as any)?.file,
      line: (error as any)?.line,
      routine: (error as any)?.routine,
      severity: (error as any)?.severity,
      severity_local: (error as any)?.severity_local,
      message: (error as any)?.message,
      fullError: error,
    });
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
