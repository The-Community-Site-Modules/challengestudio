/**
 * Prisma 7 configuration file.
 *
 * The Prisma CLI does NOT load .env.local automatically (only Next.js does).
 * We use dotenv to load it here so DATABASE_URL and DIRECT_URL are available
 * when running prisma migrate / prisma studio / prisma generate.
 *
 * URL strategy:
 *   DATABASE_URL  = transaction-mode pooler (port 6543, pgbouncer=true)
 *                   → Used at RUNTIME by PrismaClient (no migrations)
 *
 *   DIRECT_URL    = session-mode pooler (port 5432, no pgbouncer)
 *                   → Used by prisma.config.ts datasource for migrations
 *                   → Supports prepared statements, required by migrate dev
 *
 * Docs: https://pris.ly/d/config-datasource
 */

import path from 'node:path'
import { defineConfig } from 'prisma/config'
import { configDotenv } from 'dotenv'

// Load .env.local (Next.js convention) so Prisma CLI can read vars
configDotenv({ path: path.resolve(__dirname, '.env.local') })

const directUrl = process.env.DIRECT_URL

if (!directUrl) {
  throw new Error(
    '[prisma.config.ts] DIRECT_URL is not set.\n' +
    'Make sure .env.local has DIRECT_URL set to the session-mode pooler (port 5432, no pgbouncer).'
  )
}

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),

  // Use DIRECT_URL (session-mode, no pgbouncer) for all CLI commands.
  // prisma migrate dev requires prepared statements — pgbouncer=true disables them.
  datasource: {
    url: directUrl,
  },
})
