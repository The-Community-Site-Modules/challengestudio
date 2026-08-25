import type { Config } from 'drizzle-kit'

export default {
  schema: './src/schema/index.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // Uses unpooled connection for migrations
    url: process.env['DATABASE_URL_UNPOOLED'] ?? '',
  },
  // Verbose migration output for review
  verbose: true,
  strict: true,
} satisfies Config
