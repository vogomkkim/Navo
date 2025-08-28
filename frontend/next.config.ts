import type { NextConfig } from "next";
import path from "path";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  ...(isDev ? {} : { output: "export" }),

  experimental: {
    // Disable prerendering for pages that use client-side hooks
    ...(isDev
      ? {}
      : {
          workerThreads: false,
          cpus: 1,
        }),
    optimizeCss: false,
    reactCompiler: true,
  },
  // Disable static generation to avoid server-side rendering issues
  trailingSlash: false,
  outputFileTracingRoot: path.join(__dirname, "../../"),

  // Vercel 배포를 위한 설정
  distDir: isDev ? ".next" : "out",

  // CORS 헤더 설정
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
    ];
  },

  // 리다이렉트 설정 - /api가 아닌 경로는 모두 차단
  async redirects() {
    return [
      {
        source: "/:path*",
        destination: "/404",
        permanent: false,
        has: [
          {
            type: "header",
            key: "x-api-request",
            value: "(?!true)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
