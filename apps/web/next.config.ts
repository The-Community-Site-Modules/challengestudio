import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // A build writes over whatever the dev server is serving from, which leaves
  // it throwing "missing required error components" until .next is deleted.
  // Set NEXT_DIST_DIR to build somewhere else while dev keeps running.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
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
  // The headers that never vary. Content-Security-Policy is not here: it
  // carries a per-request nonce, so middleware.ts builds it.
  async headers() {
    const headers = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      // Nothing in this product uses these, so they are switched off rather
      // than left to a browser default that may change.
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
      },
      // Reduces what a cross-origin page can learn about this one.
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
    ]

    // HSTS only in production: sending it from localhost pins http://localhost
    // to https in the browser and breaks development until the pin expires.
    if (process.env.NODE_ENV === 'production') {
      headers.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      })
    }

    return [{ source: '/(.*)', headers }]
  },
}

export default nextConfig
