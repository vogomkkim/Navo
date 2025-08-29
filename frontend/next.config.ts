import type { NextConfig } from "next";
import path from "path";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  // 환경별 설정 분기
  ...(isDev
    ? {
        // 🚀 개발 환경: 일반 Next.js 앱
        // output: "export" 없음 - 정적 파일 경로 정상

        // 타입 체크 최적화
        typescript: {
          ignoreBuildErrors: false,
        },


      }
    : {
        // 📦 배포 환경: 정적 사이트 생성 (SSG)
        output: "export",
        trailingSlash: true,
        images: {
          unoptimized: true,
        },
      }),

  // Turbopack 설정 (Next.js 13+ 최신 방식)
  ...(isDev && {
    turbopack: {
      rules: {
        "*.css": {
          loaders: ["css-loader"],
          as: "*.css",
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

  outputFileTracingRoot: path.join(__dirname, ".."),
};

export default nextConfig;
