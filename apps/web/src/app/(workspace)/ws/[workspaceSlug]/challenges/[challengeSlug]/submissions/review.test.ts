/**
 * Reviewing submissions (PRD §27, §15).
 *
 * §27 states plainly that "private submissions cannot be accessed by unrelated
 * participants or workspaces". Until this page existed nothing read
 * submissions at all, so the rule had nothing to bind on; these tests are what
 * hold it now that something does.
 *
 * The rest is the usual question: the submission id arrives from the browser,
 * so does the action confirm it belongs to the challenge in the URL?
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const db = {
  workspace:  { findUnique: vi.fn() },
  challenge:  { findUnique: vi.fn() },
  submission: { findUnique: vi.fn(), update: vi.fn() },
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

const requirePermission = vi.fn(async () => undefined)
const hasPermission = vi.fn(async () => true)
vi.mock('@/lib/permissions', () => ({ requirePermission, hasPermission }))

const dispatch = vi.fn(async () => ({ status: 'sent' as const }))
vi.mock('@/lib/communications', () => ({ dispatch }))

const { reviewSubmissionAction } = await import('./actions')

const withSubmission = (over: Record<string, unknown> = {}) =>
  db.submission.findUnique.mockResolvedValue({
    id: 'sub1',
    isPrivate: false,
    feedback: null,
    step: { challengeId: 'ch1', title: 'Day 1' },
    participant: {
      id: 'p1', profileId: 'u1',
      profile: { email: 'ada@example.com', fullName: 'Ada Lovelace' },
    },
    ...over,
  })

async function review(text = 'Good work, keep going.') {
  try {
    return await reviewSubmissionAction('designify', 'sprint', 'sub1', text)
  } catch (e) {
    if (e instanceof RedirectError) return { success: false, error: 'redirected' }
    throw e
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  hasPermission.mockResolvedValue(true)
  db.workspace.findUnique.mockResolvedValue({ id: 'ws1', name: 'Designify' })
  db.challenge.findUnique.mockResolvedValue({ id: 'ch1', slug: 'sprint', title: 'Design Sprint' })
  withSubmission()
})

describe('leaving feedback', () => {
  it('stores it against the submission with who and when', async () => {
    expect((await review()).success).toBe(true)
    const data = db.submission.update.mock.calls[0]?.[0]?.data
    expect(data.feedback).toBe('Good work, keep going.')
    expect(data.reviewedById).toBe('me')
    expect(data.reviewedAt).toBeInstanceOf(Date)
  })

  it('emails the participant', async () => {
    await review()
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ trigger: 'submission_feedback', to: 'ada@example.com' })
    )
  })

  it('needs submission.review, not membership alone', async () => {
    await review()
    expect(requirePermission).toHaveBeenCalledWith('me', 'ws1', 'submission.review')
  })

  it('refuses empty feedback', async () => {
    expect((await review('   ')).success).toBe(false)
    expect(db.submission.update).not.toHaveBeenCalled()
  })

  it('refuses feedback past the length limit', async () => {
    expect((await review('x'.repeat(5001))).success).toBe(false)
    expect(db.submission.update).not.toHaveBeenCalled()
  })
})

describe('private submissions', () => {
  it('refuses a reviewer without permission to see private work', async () => {
    // §27: private work is for the participant and authorised facilitators.
    withSubmission({ isPrivate: true })
    hasPermission.mockResolvedValue(false)
    const result = await review()
    expect(result.success).toBe(false)
    expect(db.submission.update).not.toHaveBeenCalled()
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('allows one who does have it', async () => {
    withSubmission({ isPrivate: true })
    hasPermission.mockResolvedValue(true)
    expect((await review()).success).toBe(true)
    expect(hasPermission).toHaveBeenCalledWith('me', 'ws1', 'submission.view_private')
  })

  it('does not ask about private permission for work that is not private', async () => {
    await review()
    expect(hasPermission).not.toHaveBeenCalled()
  })
})

describe('tenant isolation', () => {
  it('refuses a submission from another challenge', async () => {
    withSubmission({ step: { challengeId: 'ch-elsewhere', title: 'Day 1' } })
    expect((await review()).success).toBe(false)
    expect(db.submission.update).not.toHaveBeenCalled()
  })

  it('refuses a submission that does not exist', async () => {
    db.submission.findUnique.mockResolvedValue(null)
    expect((await review()).success).toBe(false)
    expect(db.submission.update).not.toHaveBeenCalled()
  })

  it('refuses when the workspace slug is not real', async () => {
    db.workspace.findUnique.mockResolvedValue(null)
    expect((await review()).success).toBe(false)
    expect(requirePermission).not.toHaveBeenCalled()
  })

  it('refuses when the challenge is not in that workspace', async () => {
    db.challenge.findUnique.mockResolvedValue(null)
    expect((await review()).success).toBe(false)
    expect(db.submission.update).not.toHaveBeenCalled()
  })
})
