import { PrismaClient } from '../../generated/prisma/index.js';

// Prisma 클라이언트 인스턴스 생성
export const prisma = new PrismaClient();

// 데이터베이스 연결 테스트
export async function testConnection(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('[DB] Database connection successful');
  } catch (error) {
    console.error('[DB] Database connection failed:', error);
    throw error;
  }
}

// 데이터베이스 연결 종료
export async function disconnect(): Promise<void> {
  await prisma.$disconnect();
  console.log('[DB] Database connection closed');
}

// 애플리케이션 종료 시 연결 정리
process.on('beforeExit', async () => {
  await disconnect();
});
