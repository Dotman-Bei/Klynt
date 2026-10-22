import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || '.next',
  devIndicators: false,
  // Loaded by Node directly: PGlite finds its WebAssembly through file URLs that bundling would break.
  serverExternalPackages: ['@electric-sql/pglite', '@neondatabase/serverless'],
  async headers() {
    // Hosted games may only be framed by Klynt itself.
    return [{ source: '/games/:path*', headers: [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }] }];
  },
};

export default nextConfig;
