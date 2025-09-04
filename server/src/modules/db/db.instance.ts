import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import logger from '@/lib/logger';
import * as schema from '@/schema';

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
  logger.error(
    '데이터베이스 클라이언트를 생성할 수 없습니다: DATABASE_URL이 비어 있습니다.'
  );
  throw new Error('DATABASE_URL 환경 변수가 필요합니다.');
}

let client: postgres.Sql;
try {
  client = postgres(connectionString, {
    prepare: true,
    onnotice: (notice) => logger.debug({ notice }, 'PostgreSQL 알림'),
    onparameter: (param) => {
      // 중요한 매개변수만 로깅
      if (
        typeof param === 'string' &&
        (param.includes('server_version') || param.includes('client_encoding'))
      ) {
        logger.debug({ param }, 'PostgreSQL 매개변수');
      }
    },
    onclose: () => logger.info('데이터베이스 연결이 종료되었습니다.'),
    ssl: 'require', // Always require SSL
  });
  logger.info('데이터베이스 클라이언트가 생성되었습니다.');
} catch (error) {
  logger.error(
    {
      err: error instanceof Error ? error.message : String(error),
    },
    '데이터베이스 클라이언트 생성 실패'
  );
  throw error;
}

export { client };
export const db = drizzle(client, { schema });

export async function testConnection(): Promise<void> {
  try {
    await client`select 1`;
    logger.info('데이터베이스 연결 테스트 성공');
  } catch (error) {
    logger.error(
      {
        err: error instanceof Error ? error.message : String(error),
      },
      '데이터베이스 연결 실패'
    );
    throw error;
  }
}

export async function disconnect(): Promise<void> {
  await client.end({ timeout: 5 });
  logger.info('데이터베이스 연결이 종료되었습니다.');
}

// 서버 종료 시에만 연결 종료
process.on('beforeExit', async () => {
  await disconnect();
});
