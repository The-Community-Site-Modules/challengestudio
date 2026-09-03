/**
 * Prisma 7 configuration file.
 *
 * The Prisma CLI does not load `.env.local` (only Next.js does), so dotenv
 * loads it here — otherwise `prisma migrate` and `prisma studio` cannot see
 * the database URLs.
 *
 * URL strategy:
 *   DATABASE_URL  transaction-mode pooler (port 6543, pgbouncer=true).
 *                 Used at RUNTIME by PrismaClient. Never for migrations.
 *
 *   DIRECT_URL    session-mode pooler (port 5432, no pgbouncer). Used by the
 *                 CLI for migrations, which need prepared statements —
 *                 pgbouncer=true disables them.
 *
 * ── Why the missing-URL check is conditional ────────────────────────────────
 *
 * This file used to throw whenever DIRECT_URL was unset, whatever the CLI had
 * been asked to do. That broke deployment in a way that took a while to see.
 *
 * `postinstall` runs `prisma generate`, so this config loads during
 * `pnpm install` — which is the *install step* of a Vercel build. A Vercel
 * project without DIRECT_URL therefore died before Next.js ever started, and
 * the error blamed a Prisma config file rather than a missing environment
 * variable. Every deployment of this repository failed that way. CI passed
 * throughout, because the workflow sets placeholder URLs at job level for
 * exactly this reason — the value only has to exist, never to connect.
 *
 * `prisma generate` reads the schema and writes a client. It opens no
 * connection and needs no URL. So the check now applies only to the commands
 * that genuinely talk to a database. A deploy missing DIRECT_URL now gets
 * through install, and fails at the point that actually needs it, saying
 * which variable is missing.
 *
 * Docs: https://pris.ly/d/config-datasource
 */

import path from 'node:path'
import { defineConfig } from 'prisma/config'
import { configDotenv } from 'dotenv'

configDotenv({ path: path.resolve(__dirname, '.env.local') })

/**
 * CLI commands that open a connection. Everything else — `generate`,
 * `format`, `validate`, `version` — works from the schema file alone.
 */
const NEEDS_DATABASE = new Set(['migrate', 'db', 'studio'])

/**
 * The subcommand, from `node …/prisma/build/index.js <command> [...]`.
 * Flags are skipped, so `prisma --schema=… migrate` is still recognised.
 */
function currentCommand(): string {
  return process.argv.slice(2).find((arg) => !arg.startsWith('-')) ?? ''
}

const directUrl = process.env.DIRECT_URL
const command = currentCommand()

if (!directUrl && NEEDS_DATABASE.has(command)) {
  throw new Error(
    `[prisma.config.ts] DIRECT_URL is not set, and \`prisma ${command}\` needs it.\n` +
    'Locally: add it to apps/web/.env.local — the session-mode pooler, port 5432, no pgbouncer.\n' +
    'On a host: add it to the project environment variables.'
  )
}

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),

  // Omitted entirely when unset rather than passed as undefined: with
  // exactOptionalPropertyTypes those are not the same thing, and Prisma should
  // fall back to the schema's own datasource block.
  ...(directUrl ? { datasource: { url: directUrl } } : {}),
})
