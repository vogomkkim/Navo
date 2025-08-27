import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    // Disable prerendering for pages that use client-side hooks
    workerThreads: false,
    cpus: 1,
    optimizeCss: false,
  },
  // Disable static generation to avoid server-side rendering issues
  trailingSlash: false,
  outputFileTracingRoot: path.join(__dirname, "../../"),

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
};

export default nextConfig;
