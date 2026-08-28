/**
 * Health check (milestone 11).
 *
 * A liveness probe that only proves Node is running tells you nothing useful —
 * the app is almost never the thing that breaks. This touches the database,
 * because that is what an uptime check needs to know about.
 *
 * Deliberately says very little on failure. "unhealthy" plus a 503 is enough
 * for a monitor; the reason belongs in the logs, not in a public response that
 * would happily report a connection string or a table name to anyone asking.
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const started = Date.now()

  try {
    await db.$queryRaw`select 1`
  } catch (error) {
    console.error('[health] database unreachable:', error)
    return NextResponse.json(
      { status: 'unhealthy', database: 'unreachable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  return NextResponse.json(
    { status: 'ok', database: 'ok', latencyMs: Date.now() - started },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  )
}
