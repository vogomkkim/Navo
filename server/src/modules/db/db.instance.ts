import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.js'; // 새 경로 참조
import logger from '@/lib/logger'; // 새 경로 참조

const connectionString = process.env.DATABASE_URL ?? '';

// 연결 정보 로깅 (민감한 정보는 마스킹)
function logConnectionInfo() {
  if (!connectionString) {
    logger.error('DATABASE_URL 환경 변수가 설정되지 않았습니다.');
    return;
  }

  logger.info('데이터베이스에 연결 중...');
}

// 연결 시도 전 로깅
logConnectionInfo();

// 연결 문자열 검증
if (!connectionString) {
  logger.error('데이터베이스 클라이언트를 생성할 수 없습니다: DATABASE_URL이 비어 있습니다.');
  throw new Error('DATABASE_URL 환경 변수가 필요합니다.');
}

let client: postgres.Sql;
try {
  client = postgres(connectionString, {
    prepare: true,
    onnotice: (notice) => logger.debug('PostgreSQL 알림:', notice),
    onparameter: (param) => {
      // 중요한 매개변수만 로깅
      if (
        typeof param === 'string' &&
        (param.includes('server_version') || param.includes('client_encoding'))
      ) {
        logger.debug('PostgreSQL 매개변수:', param);
      }
    },
    onclose: () => logger.info('데이터베이스 연결이 종료되었습니다.'),
    ssl: 'require',
  });
  logger.info('데이터베이스 클라이언트가 생성되었습니다.');
} catch (error) {
  logger.error('데이터베이스 클라이언트 생성 실패', {
    error: error instanceof Error ? error.message : String(error),
  });
  throw error;
}

export { client };
export const db = drizzle(client, { schema });

export async function testConnection(): Promise<void> {
  try {
    await client`select 1`;
    // 성공: 호출자가 로깅; 중복 시작 로깅 방지
  } catch (error) {
    logger.error('데이터베이스 연결 실패', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function disconnect(): Promise<void> {
  await client.end({ timeout: 5 });
  logger.info('데이터베이스 연결이 종료되었습니다.');
}

process.on('beforeExit', async () => {
  await disconnect();
});
