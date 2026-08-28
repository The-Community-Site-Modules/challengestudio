/**
 * Who is making this request, for rate-limiting purposes.
 *
 * Kept apart from the limiter itself so the limiter stays a pure function that
 * tests can drive without a request context.
 */

import { headers } from 'next/headers'

/**
 * The caller's IP address, as far as it can be known behind a proxy.
 *
 * `x-forwarded-for` is a client-controllable header everywhere except behind a
 * proxy that overwrites it — which Vercel does. The *first* entry is the
 * original client; taking the last would give the proxy's own address and
 * collapse every visitor into one bucket.
 *
 * Returns 'unknown' when there is no header at all, which buckets those
 * callers together. That is the safe direction: an unidentifiable caller
 * shares a stricter budget rather than escaping the limit.
 */
export async function callerIp(): Promise<string> {
  const h = await headers()
  const forwarded = h.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  return h.get('x-real-ip')?.trim() || 'unknown'
}
