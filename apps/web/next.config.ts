import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [],
  },
  // Prevent server-only packages from being bundled into client
  serverExternalPackages: [
    '@prisma/client',
    '.prisma/client',
    '@supabase/server',
    '@aws-sdk/client-s3',
    '@aws-sdk/s3-request-presigner',
    'resend',
    '@react-email/components',
    'inngest',
    '@upstash/redis',
    '@upstash/ratelimit',
    '@sentry/nextjs',
  ],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

export default nextConfig
