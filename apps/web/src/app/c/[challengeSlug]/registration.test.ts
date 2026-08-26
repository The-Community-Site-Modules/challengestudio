/**
 * The public registration funnel.
 *
 * registerAction is the one server action in the app that runs for people who
 * are not signed in and belong to no workspace, so nothing upstream has already
 * refused a bad request. Every gate it applies is the only one there is.
 *
 * Two of these gates were settings the wizard collected, stored, and then never
 * read: requiresApproval admitted everyone anyway, and isPublic left a private
 * challenge registerable by anyone holding the link.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Doubles ─────────────────────────────────────────────────────────────────

const db = {
  challenge:   { findFirst: vi.fn(), findUnique: vi.fn() },
  participant: { upsert: vi.fn() },
  profile:     { upsert: vi.fn() },
}
vi.mock('@/lib/db', () => ({ db }))

/** redirect() throws in Next; these tests read the destination out of the throw. */
class RedirectError extends Error {
  constructor(public to: string) { super(to) }
}
vi.mock('next/navigation', () => ({
  redirect: (to: string) => { throw new RedirectError(to) },
}))

const auth = { user: null as { id: string; email: string } | null, otpError: null as { message: string } | null }
interface OtpArgs { email: string; options?: { emailRedirectTo?: string } }
const signInWithOtp = vi.fn(async (_args: OtpArgs) => ({ error: auth.otpError }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser:        async () => ({ data: { user: auth.user } }),
      signInWithOtp,
    },
  }),
}))

const { registerAction, enrollAfterAuthAction } = await import('./actions')

// ─── Fixtures ────────────────────────────────────────────────────────────────

/** A challenge that accepts registrations; each test breaks one thing. */
const OPEN_CHALLENGE = {
  id: 'ch1',
  slug: 'design-sprint',
  title: '30-Day Design Sprint',
  status: 'PUBLISHED',
  maxParticipants: null,
  requiresApproval: false,
  isPublic: true,
  registrationOpensAt: null,
  registrationClosesAt: null,
  _count: { participants: 4 },
}

const withChallenge = (patch: Record<string, unknown> = {}) =>
  db.challenge.findFirst.mockResolvedValue({ ...OPEN_CHALLENGE, ...patch })

const form = (over: Record<string, string> = {}) => {
  const fd = new FormData()
  fd.set('firstName', 'Ada')
  fd.set('lastName',  'Lovelace')
  fd.set('email',     'ada@example.com')
  for (const [k, v] of Object.entries(over)) fd.set(k, v)
  return fd
}

/** Runs the action and reports where it sent the visitor. */
async function register(fd = form()) {
  try {
    await registerAction('design-sprint', fd)
    return { redirectedTo: null as string | null }
  } catch (e) {
    if (e instanceof RedirectError) return { redirectedTo: e.to }
    throw e
  }
}

const createdStatus = () => db.participant.upsert.mock.calls[0]?.[0]?.create?.status

beforeEach(() => {
  vi.clearAllMocks()
  auth.user = null
  auth.otpError = null
  withChallenge()
})

// ─── Who may register ────────────────────────────────────────────────────────

describe('registration gates', () => {
  it('refuses a challenge that does not exist', async () => {
    db.challenge.findFirst.mockResolvedValue(null)
    const { redirectedTo } = await register()
    expect(redirectedTo).toContain('Challenge%20not%20found')
    expect(db.participant.upsert).not.toHaveBeenCalled()
  })

  it('refuses a draft challenge', async () => {
    withChallenge({ status: 'DRAFT' })
    expect((await register()).redirectedTo).toContain('Registration%20is%20not%20open')
  })

  it('refuses a private challenge', async () => {
    // isPublic was stored but never read: anyone with the link could join.
    withChallenge({ isPublic: false })
    const { redirectedTo } = await register()
    expect(redirectedTo).toContain('private')
    expect(db.participant.upsert).not.toHaveBeenCalled()
  })

  it('refuses before the registration window opens', async () => {
    withChallenge({ registrationOpensAt: new Date(Date.now() + 86_400_000) })
    expect((await register()).redirectedTo).toContain('not%20open%20yet')
  })

  it('refuses after the registration window closes', async () => {
    withChallenge({ registrationClosesAt: new Date(Date.now() - 86_400_000) })
    expect((await register()).redirectedTo).toContain('closed')
  })

  it('refuses once the challenge is full', async () => {
    withChallenge({ maxParticipants: 4, _count: { participants: 4 } })
    expect((await register()).redirectedTo).toContain('full')
  })

  it('allows the last place when one remains', async () => {
    auth.user = { id: 'u1', email: 'ada@example.com' }
    withChallenge({ maxParticipants: 5, _count: { participants: 4 } })
    await register()
    expect(db.participant.upsert).toHaveBeenCalled()
  })

  it('requires an email and a first name', async () => {
    const { redirectedTo } = await register(form({ email: '', firstName: '' }))
    expect(redirectedTo).toContain('fill%20in%20all%20required%20fields')
    expect(db.participant.upsert).not.toHaveBeenCalled()
  })
})

// ─── Approval ────────────────────────────────────────────────────────────────

describe('approval', () => {
  beforeEach(() => { auth.user = { id: 'u1', email: 'ada@example.com' } })

  it('admits straight away when approval is not required', async () => {
    await register()
    expect(createdStatus()).toBe('REGISTERED')
  })

  it('parks the participant on PENDING when approval is required', async () => {
    // The setting used to do nothing at all — everyone landed on REGISTERED.
    withChallenge({ requiresApproval: true })
    await register()
    expect(createdStatus()).toBe('PENDING')
  })

  it('reaches the same decision on the magic-link path', async () => {
    // This path enrols later, in the auth callback, so it re-reads the setting
    // rather than inheriting the one registerAction saw.
    db.challenge.findUnique.mockResolvedValue({ requiresApproval: true })
    await enrollAfterAuthAction('u2', 'ada@example.com', 'Ada Lovelace', 'ch1')
    expect(createdStatus()).toBe('PENDING')
  })

  it('does not gate the magic-link path when approval is off', async () => {
    db.challenge.findUnique.mockResolvedValue({ requiresApproval: false })
    await enrollAfterAuthAction('u2', 'ada@example.com', 'Ada Lovelace', 'ch1')
    expect(createdStatus()).toBe('REGISTERED')
  })

  it('fails loudly if the challenge vanished before enrolment', async () => {
    // Silently skipping would sign someone in with no place in the challenge.
    db.challenge.findUnique.mockResolvedValue(null)
    await expect(enrollAfterAuthAction('u2', 'a@b.com', 'Ada', 'gone')).rejects.toThrow(/not found/)
    expect(db.participant.upsert).not.toHaveBeenCalled()
  })
})

// ─── The two ways in ─────────────────────────────────────────────────────────

describe('signed-in visitors', () => {
  beforeEach(() => { auth.user = { id: 'u1', email: 'ada@example.com' } })

  it('enrols without sending a magic link', async () => {
    const { redirectedTo } = await register()
    expect(signInWithOtp).not.toHaveBeenCalled()
    expect(db.participant.upsert).toHaveBeenCalled()
    expect(redirectedTo).toContain('/confirm')
  })

  it('enrols idempotently, so registering twice is harmless', async () => {
    await register()
    expect(db.participant.upsert.mock.calls[0]?.[0]?.update).toEqual({})
  })
})

describe('new visitors', () => {
  it('sends a magic link and enrols only after it is clicked', async () => {
    const { redirectedTo } = await register()
    expect(signInWithOtp).toHaveBeenCalled()
    // The participant row belongs to the callback; creating it here would
    // enrol an unverified email address.
    expect(db.participant.upsert).not.toHaveBeenCalled()
    expect(redirectedTo).toContain('/confirm')
  })

  it('carries the challenge into the callback so enrolment can finish', async () => {
    await register()
    const redirectTo = signInWithOtp.mock.calls[0]?.[0]?.options?.emailRedirectTo ?? ''
    expect(redirectTo).toContain('challenge=ch1')
    expect(redirectTo).toContain('/api/auth/callback')
  })

  it('surfaces a failure to send the magic link', async () => {
    auth.otpError = { message: 'email rate limit exceeded' }
    expect((await register()).redirectedTo).toContain('rate%20limit')
  })
})
