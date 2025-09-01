import { FastifyInstance } from 'fastify';
import { authenticateToken } from '../auth/auth.js';
import aiRoutes from './aiRoutes.js';
import authRoutes from './authRoutes.js';
import projectRoutes from './projectRoutes.js';
import pageRoutes from './pageRoutes.js';
import componentRoutes from './componentRoutes.js';
import healthRoutes from './healthRoutes.js';

export default async function apiRoutes(app: FastifyInstance) {
  console.log('🚀 API 라우트 등록 시작...');

  // AI 관련 라우트
  console.log('🤖 AI 라우트 등록 중...');
  app.register(aiRoutes, { prefix: '/api' });
  console.log('✅ AI 라우트 등록 완료');

  // 인증 관련 라우트
  console.log('🔐 인증 라우트 등록 중...');
  app.register(authRoutes, { prefix: '/api' });
  console.log('✅ 인증 라우트 등록 완료');

  // 프로젝트 관련 라우트
  console.log('📁 프로젝트 라우트 등록 중...');
  app.register(projectRoutes, { prefix: '/api' });
  console.log('✅ 프로젝트 라우트 등록 완료');

  // 페이지 관련 라우트
  console.log('📄 페이지 라우트 등록 중...');
  app.register(pageRoutes, { prefix: '/api' });
  console.log('✅ 페이지 라우트 등록 완료');

  // 컴포넌트 관련 라우트
  console.log('🧩 컴포넌트 라우트 등록 중...');
  app.register(componentRoutes, { prefix: '/api' });
  console.log('✅ 컴포넌트 라우트 등록 완료');

  // 헬스체크 라우트
  console.log('🩺 헬스체크 라우트 등록 중...');
  app.register(healthRoutes, { prefix: '/api' });
  console.log('✅ 헬스체크 라우트 등록 완료');

  console.log('🎉 모든 API 라우트 등록 완료!');
}
