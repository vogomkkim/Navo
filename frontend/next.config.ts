import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    // Disable prerendering for pages that use client-side hooks
    workerThreads: false,
    cpus: 1,
    optimizeCss: false
  },
  // Disable static generation to avoid server-side rendering issues
  trailingSlash: false,
  outputFileTracingRoot: path.join(__dirname, '../../'),
};

export default nextConfig;
