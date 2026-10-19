import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  async headers() {
    // Hosted games may only be framed by Klynt itself.
    return [{ source: '/games/:path*', headers: [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }] }];
  },
};

export default nextConfig;
