import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    // Disable prerendering for pages that use client-side hooks
    workerThreads: false,
    cpus: 1
  },
  // Disable static generation to avoid server-side rendering issues
  trailingSlash: false
};

export default nextConfig;
