/**
 * Prisma Client singleton for Challenge Studio.
 *
 * Prisma 7 with @prisma/adapter-pg over the Supabase connection pooler.
 * DATABASE_URL → transaction-mode pooler (port 6543, pgbouncer=true).
 *
 * In development the singleton lives on globalThis so hot reloads do not
 * exhaust the Supabase connection limit.
 *
 * Usage — server only (Server Components, Server Actions, route handlers):
 *   import { db } from '@/lib/db'
 *   const challenges = await db.challenge.findMany()
 *
 * ── Why the client is built lazily ──────────────────────────────────────────
 *
 * `export const db = createPrismaClient()` ran at module load, which meant
 * importing this file required DATABASE_URL. Next evaluates every route module
 * during "collect page data" at build time, so a production build failed
 * without a database URL — reported as "Failed to collect page data for
 * /c/[challengeSlug]/…", with the real cause several lines up. That is the
 * second reason deployments of this repository failed; the first was in
 * prisma.config.ts.
 *
 * No query runs at build time. Building the client then is work done to be
 * thrown away, and a hard requirement for a variable nothing was about to use.
 * The proxy below defers construction to the first property access, so:
 *
 *   - a build with no DATABASE_URL succeeds, because nothing touches the
 *     client while collecting page data;
 *   - the first real query still throws the same message it always did, at
 *     the moment the connection is genuinely needed.
 */

// In Prisma 7 the generated client lives in .prisma/client
import { PrismaClient } from '.prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

type PrismaClientType = InstanceType<typeof PrismaClient>

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientType | undefined
}

function createPrismaClient(): PrismaClientType {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Add it to .env.local:\n' +
      'DATABASE_URL="postgresql://postgres.your-ref:[PASSWORD]@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true"'
    )
  }

  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

let client: PrismaClientType | undefined

function getClient(): PrismaClientType {
  if (!client) {
    client = globalForPrisma.prisma ?? createPrismaClient()
    if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = client
  }
  return client
}

/**
 * Behaves exactly like a PrismaClient; it just is not one until something
 * asks it for something. Methods are bound to the real client so `this` is
 * correct when they are destructured, which `db.$transaction` relies on.
 */
export const db: PrismaClientType = new Proxy({} as PrismaClientType, {
  get(_target, property) {
    const target = getClient()
    const value = Reflect.get(target, property) as unknown
    return typeof value === 'function' ? value.bind(target) : value
  },
  has(_target, property) {
    return Reflect.has(getClient(), property)
  },
})
