import type { NextConfig } from 'next';

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

  async rewrites() {
    const origin = process.env.NEXT_PUBLIC_API_ORIGIN;
    if (!origin) {
      return [];
    }
    return [
      // Backend API (explicit paths only) → avoid catching Next.js /api routes
      { source: '/api/projects/:path*', destination: `${origin}/api/projects/:path*` },
      { source: '/api/pages/:path*', destination: `${origin}/api/pages/:path*` },
      { source: '/api/components/:path*', destination: `${origin}/api/components/:path*` },
      { source: '/api/events', destination: `${origin}/api/events` },
      { source: '/api/log-error', destination: `${origin}/api/log-error` },

      // Preview/site proxies
      { source: '/site/:projectId', destination: `${origin}/site/:projectId` },
      { source: '/p/:previewId', destination: `${origin}/preview-domain/:previewId` },
      { source: '/p/:previewId/:path*', destination: `${origin}/preview-domain/:previewId/:path*` },
      { source: '/preview/:pageId/:path*', destination: `${origin}/preview/:pageId/:path*` },
      { source: '/preview/:path*', destination: `${origin}/preview/:path*` },
    ];
  },
};

export default nextConfig;
