/**
 * The publish gate.
 *
 * Publishing is the moment a challenge becomes a public page anyone can reach.
 * A half-built one going live is worse than a draft, so these pin down what the
 * gate refuses — including the cases the old three-check version let through.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const db = {
  workspace: { findUnique: vi.fn() },
  challenge: { findUnique: vi.fn(), update: vi.fn() },
}
vi.mock('@/lib/db', () => ({ db }))

class RedirectError extends Error {}
vi.mock('next/navigation', () => ({
  redirect: (to: string) => { throw new RedirectError(to) },
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth/session', () => ({
  requireUser: async () => ({ id: 'me', email: 'me@example.com', fullName: 'Me', avatarUrl: null }),
}))
vi.mock('@/lib/permissions', () => ({
  requirePermission: async () => undefined,
  getMembership: async () => ({ role: 'OWNER' }),
}))
vi.mock('@/lib/email', () => ({
  sendEmail: async () => ({ sent: true, provider: 'resend' }),
  renderWorkspaceInvitation: () => ({}),
}))

const { publishChallengeAction } = await import('./actions')

/** A challenge that should publish cleanly; tests break one thing at a time. */
const READY = {
  title: '30-Day Design Sprint',
  slug: '30-day-design-sprint',
  description: 'Ship a component every day for a month.',
  promise: 'Master the fundamentals in 30 days.',
  startsAt: new Date('2026-09-01'),
  endsAt: new Date('2026-09-30'),
  registrationOpensAt: new Date('2026-08-20'),
  registrationClosesAt: new Date('2026-08-31'),
  steps: [{ id: 's1', isPublished: true, _count: { contentBlocks: 3 } }],
}

const withChallenge = (patch: Record<string, unknown> = {}) => {
  db.challenge.findUnique.mockResolvedValue({ ...READY, ...patch })
}

async function publish() {
  db.challenge.update.mockResolvedValue({ slug: '30-day-design-sprint' })
  try {
    return await publishChallengeAction('ch1', 'designify')
  } catch (e) {
    if (e instanceof RedirectError) return { success: true, errors: [] as string[] }
    throw e
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  db.workspace.findUnique.mockResolvedValue({ id: 'ws1', slug: 'designify' })
})

describe('a challenge that is ready', () => {
  it('publishes', async () => {
    withChallenge()
    const result = await publish()
    expect(result.success).toBe(true)
    expect(db.challenge.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'PUBLISHED' } })
    )
  })
})

describe('public-page fields', () => {
  it('refuses without a promise — it is the headline people read', async () => {
    withChallenge({ promise: null })
    const result = await publish()
    expect(result.success).toBe(false)
    expect(result.errors.join(' ')).toMatch(/promise/i)
    expect(db.challenge.update).not.toHaveBeenCalled()
  })

  it('refuses without a description', async () => {
    withChallenge({ description: '   ' })
    expect((await publish()).errors.join(' ')).toMatch(/description/i)
  })

  it('refuses without a title or slug', async () => {
    withChallenge({ title: '', slug: '' })
    const errors = (await publish()).errors.join(' ')
    expect(errors).toMatch(/title/i)
    expect(errors).toMatch(/slug/i)
  })
})

describe('schedule', () => {
  it('refuses without a start date', async () => {
    withChallenge({ startsAt: null })
    expect((await publish()).errors.join(' ')).toMatch(/start date/i)
  })

  it('refuses an end date before the start', async () => {
    withChallenge({ startsAt: new Date('2026-09-10'), endsAt: new Date('2026-09-01') })
    expect((await publish()).errors.join(' ')).toMatch(/end date/i)
  })

  it('refuses registration closing before it opens', async () => {
    withChallenge({
      registrationOpensAt: new Date('2026-08-30'),
      registrationClosesAt: new Date('2026-08-01'),
    })
    expect((await publish()).errors.join(' ')).toMatch(/registration/i)
  })

  it('allows a blank end date and registration window', async () => {
    withChallenge({ endsAt: null, registrationOpensAt: null, registrationClosesAt: null })
    expect((await publish()).success).toBe(true)
  })
})

describe('content', () => {
  it('refuses with no steps at all', async () => {
    withChallenge({ steps: [] })
    expect((await publish()).errors.join(' ')).toMatch(/at least one step/i)
  })

  it('refuses when every step is still a draft', async () => {
    // The old gate counted steps, not published ones — participants would have
    // arrived to a challenge with nothing visible in it.
    withChallenge({ steps: [{ id: 's1', isPublished: false, _count: { contentBlocks: 5 } }] })
    expect((await publish()).errors.join(' ')).toMatch(/no step is published/i)
  })

  it('refuses when a published step has no content', async () => {
    withChallenge({
      steps: [
        { id: 's1', isPublished: true, _count: { contentBlocks: 2 } },
        { id: 's2', isPublished: true, _count: { contentBlocks: 0 } },
      ],
    })
    expect((await publish()).errors.join(' ')).toMatch(/no content blocks/i)
  })

  it('ignores empty steps that are still drafts', async () => {
    withChallenge({
      steps: [
        { id: 's1', isPublished: true,  _count: { contentBlocks: 2 } },
        { id: 's2', isPublished: false, _count: { contentBlocks: 0 } },
      ],
    })
    expect((await publish()).success).toBe(true)
  })
})

describe('reporting', () => {
  it('returns every problem at once, not just the first', async () => {
    withChallenge({ promise: null, description: null, startsAt: null, steps: [] })
    const { errors } = await publish()
    expect(errors.length).toBeGreaterThanOrEqual(4)
  })
})
