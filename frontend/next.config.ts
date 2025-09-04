// frontend/next.config.ts
import path from 'node:path';

import type { NextConfig } from 'next';

const origin = process.env.NEXT_PUBLIC_API_ORIGIN || 'http://localhost:3001';

const nextConfig = {
  // 모노레포에서 lockfile 중복 경고 제거용
  outputFileTracingRoot: path.join(__dirname, '..'),

  // 이미지 최적화는 기본값(ON) 유지 권장
  // 정적 export 필요할 때만 아래를 켜세요.
  // images: { unoptimized: true },

  async rewrites() {
    if (!origin) return [];
    return [
      // 모든 API 경로를 백엔드로 프록시
      { source: '/api/:path*', destination: `${origin}/api/:path*` },
      { source: '/api', destination: `${origin}/api` },

      // 비-API 경로 (프리뷰/퍼블릭 사이트)
      { source: '/site/:projectId', destination: `${origin}/site/:projectId` },
      {
        source: '/p/:previewId',
        destination: `${origin}/preview-domain/:previewId`,
      },
      {
        source: '/p/:previewId/:path*',
        destination: `${origin}/preview-domain/:previewId/:path*`,
      },
      {
        source: '/preview/:pageId/:path*',
        destination: `${origin}/preview/:pageId/:path*`,
      },
      { source: '/preview/:path*', destination: `${origin}/preview/:path*` },
    ];
  },
} satisfies NextConfig;

export default nextConfig;
