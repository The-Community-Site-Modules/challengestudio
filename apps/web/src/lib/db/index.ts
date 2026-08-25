/**
 * Prisma Client singleton for Challenge Studio.
 *
 * Prisma 7 with @prisma/adapter-pg for the Supabase connection pooler.
 * DATABASE_URL → transaction-mode pooler (port 6543, pgbouncer=true)
 *
 * In development the singleton is stored on globalThis to survive hot-reloads
 * without exhausting the Supabase connection limit.
 *
 * Usage (Server Components, Server Actions, API Routes — server-only):
 *   import { db } from '@/lib/db'
 *   const challenges = await db.challenge.findMany()
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

export const db: PrismaClientType = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}
