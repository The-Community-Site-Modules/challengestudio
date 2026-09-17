/**
 * Where the auth emails send people back to.
 *
 * Sign-up pointed its confirmation link at `/auth/verify`, which is the
 * "check your inbox" page: it reads email, error and message off the query
 * string and never looks at the `code`. So confirming an address created no
 * session and left the person to sign in by hand — the link appeared to work,
 * because the page it landed on looks like a success page.
 *
 * The other three flows already pointed at `/api/auth/callback`, the route
 * that actually exchanges the code. One of four being different is exactly the
 * shape of bug a test should pin, so all four are pinned here.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const calls: Array<{ method: string; options: Record<string, unknown> }> = []

const auth = {
  signUp: vi.fn(async (args: { options?: Record<string, unknown> }) => {
    calls.push({ method: 'signUp', options: args.options ?? {} })
    return { error: null }
  }),
  signInWithOtp: vi.fn(async (args: { options?: Record<string, unknown> }) => {
    calls.push({ method: 'signInWithOtp', options: args.options ?? {} })
    return { error: null }
  }),
  resetPasswordForEmail: vi.fn(async (_email: string, options: Record<string, unknown>) => {
    calls.push({ method: 'resetPasswordForEmail', options })
    return { error: null }
  }),
  resend: vi.fn(async (args: { options?: Record<string, unknown> }) => {
    calls.push({ method: 'resend', options: args.options ?? {} })
    return { error: null }
  }),
}
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth }) }))

class RedirectError extends Error {
  constructor(public destination: string) { super(`REDIRECT:${destination}`) }
}
vi.mock('next/navigation', () => ({
  redirect: (to: string) => { throw new RedirectError(to) },
}))

// Rate limiting reads the caller's address off the request; there is none here.
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': '203.0.113.9' }),
}))

const APP_URL = 'https://challengestudio.example'

const {
  signUpAction, signInWithMagicLinkAction, forgotPasswordAction, resendVerificationAction,
} = await import('./actions')
const { __resetRateLimits } = await import('@/lib/rate-limit')

/** Run an action that ends in a redirect, and ignore where it went. */
async function run(action: () => Promise<unknown>) {
  try { await action() } catch (e) { if (!(e instanceof RedirectError)) throw e }
}

function form(fields: Record<string, string>): FormData {
  const data = new FormData()
  for (const [k, v] of Object.entries(fields)) data.set(k, v)
  return data
}

beforeEach(() => {
  vi.clearAllMocks()
  calls.length = 0
  __resetRateLimits()
  vi.stubEnv('NEXT_PUBLIC_APP_URL', APP_URL)
})

describe('the confirmation link', () => {
  it('sends a new sign-up to the callback that exchanges the code', async () => {
    await run(() => signUpAction(form({
      firstName: 'Jane', lastName: 'Smith',
      email: 'jane@example.com', password: 'abcdefg1',
    })))

    expect(calls[0]?.options.emailRedirectTo).toBe(`${APP_URL}/api/auth/callback`)
  })

  it('does not send it to /auth/verify, which creates no session', async () => {
    // The original bug, stated as a test so it cannot come back.
    await run(() => signUpAction(form({
      firstName: 'Jane', lastName: 'Smith',
      email: 'jane@example.com', password: 'abcdefg1',
    })))

    expect(calls[0]?.options.emailRedirectTo).not.toContain('/auth/verify')
  })
})

describe('every other flow that emails a link', () => {
  it('a magic link goes to the callback', async () => {
    await run(() => signInWithMagicLinkAction(form({ email: 'jane@example.com' })))
    expect(calls[0]?.options.emailRedirectTo).toContain(`${APP_URL}/api/auth/callback`)
  })

  it('a resent verification goes to the callback', async () => {
    await run(() => resendVerificationAction(form({ email: 'jane@example.com' })))
    expect(calls[0]?.options.emailRedirectTo).toBe(`${APP_URL}/api/auth/callback`)
  })

  it('a password reset goes to the page that sets a new password', async () => {
    // The one legitimate exception: reset-password is a form, not a landing
    // page, and Supabase signs the user in before it loads.
    await run(() => forgotPasswordAction(form({ email: 'jane@example.com' })))
    expect(calls[0]?.options.redirectTo).toBe(`${APP_URL}/auth/reset-password`)
  })
})

describe('the URL they are built from', () => {
  it('uses NEXT_PUBLIC_APP_URL, so a wrong one breaks every link at once', async () => {
    // Worth knowing: this is a build-time value. Changing it on the host
    // without redeploying leaves the old one baked in.
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://somewhere-else.example')
    await run(() => signUpAction(form({
      firstName: 'Jane', lastName: 'Smith',
      email: 'jane@example.com', password: 'abcdefg1',
    })))

    expect(calls[0]?.options.emailRedirectTo).toBe('https://somewhere-else.example/api/auth/callback')
  })

  it('every emailed link is absolute — a relative one Supabase would reject', async () => {
    await run(() => signUpAction(form({
      firstName: 'Jane', lastName: 'Smith',
      email: 'jane@example.com', password: 'abcdefg1',
    })))
    await run(() => forgotPasswordAction(form({ email: 'jane@example.com' })))

    for (const call of calls) {
      const url = (call.options.emailRedirectTo ?? call.options.redirectTo) as string
      expect(url, call.method).toMatch(/^https?:\/\//)
    }
  })
})
