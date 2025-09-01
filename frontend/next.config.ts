import type { NextConfig } from 'next';
import path from 'path';

const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  // 타입 체크 최적화
  typescript: {
    ignoreBuildErrors: false,
  },

  // 이미지 최적화 설정
  images: {
    unoptimized: true,
  },

  // Turbopack 설정 (Next.js 13+ 최신 방식)
  ...(isDev && {
    turbopack: {
      rules: {
        '*.css': {
          loaders: ['css-loader'],
          as: '*.css',
        },
      },
    },
  }),

  experimental: {
    ...(isDev
      ? {
          // 개발 환경 실험적 기능 (turbo 제거됨)
        }
      : {
          workerThreads: false,
          cpus: 1,
        }),
    optimizeCss: false,
    // reactCompiler는 안정성을 위해 주석 처리
    // reactCompiler: true,
  },

  outputFileTracingRoot: path.join(__dirname, '..'),
};

export default nextConfig;
