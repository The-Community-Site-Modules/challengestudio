/**
 * The origin the current request came in on, for links emailed back to the
 * same person.
 *
 * Sign-in links used NEXT_PUBLIC_APP_URL. Supabase's PKCE flow stores a code
 * verifier in a cookie on the domain where the form was submitted, and only
 * that domain can complete the sign-in. When the variable named a different
 * host (the vercel.app address, the bare domain, or nothing at all), the link
 * opened somewhere without that cookie: no session, no enrolment, and the new
 * participant landed on a sign-in page asking for a password they never had.
 *
 * Server actions already require Origin to match Host (Next's CSRF check), so
 * the Origin header here is this site's own. Supabase's redirect allow-list is
 * the second guard. The environment variable remains the fallback.
 */

import { headers } from 'next/headers'

const ORIGIN = /^https?:\/\/[a-z0-9.-]+(:\d+)?$/i
const HOST = /^[a-z0-9.-]+(:\d+)?$/i

export async function requestOrigin(): Promise<string> {
  const h = await headers()

  const origin = h.get('origin')
  if (origin && ORIGIN.test(origin)) return origin

  const host = (h.get('x-forwarded-host') ?? h.get('host') ?? '').split(',')[0]?.trim() ?? ''
  if (host && HOST.test(host)) {
    const proto = (h.get('x-forwarded-proto') ?? 'https').split(',')[0]?.trim()
    return `${proto === 'http' ? 'http' : 'https'}://${host}`
  }

  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}
