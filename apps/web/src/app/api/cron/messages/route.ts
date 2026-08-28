/**
 * The clock, for scheduled messages.
 *
 * Five of the ten message types fire on time rather than on an action, and a
 * request/response app never notices a date passing. Something has to come and
 * ask; this is where it asks.
 *
 * Driven by Vercel Cron, which needs no vendor beyond the hosting already
 * chosen — so this does not pre-empt OD-04. If that decision later lands on a
 * queue, the queue calls the same sweep.
 *
 * Safe to run as often as you like: every send goes through dispatch, whose
 * idempotency key is enforced by a unique constraint, so a second run in the
 * same minute sends nothing twice.
 */

import { NextResponse } from 'next/server'
import { sweepAll } from '@/lib/communications/scheduled'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
 *
 * Without a secret configured the endpoint refuses rather than running open:
 * an unauthenticated sweep is a way for anyone to make the app send mail.
 */
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return request.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 401 })
  }

  const started = Date.now()
  const results = await sweepAll(new Date())

  return NextResponse.json({
    ok: true,
    ms: Date.now() - started,
    results,
  })
}

// Vercel Cron issues GET; POST is here so a queue or a manual run can use it too.
export const POST = GET
