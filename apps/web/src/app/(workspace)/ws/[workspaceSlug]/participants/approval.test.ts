/**
 * Approving and rejecting enrolment (milestone 5).
 *
 * The participant id comes from the client, so the question every one of these
 * asks is the same one the cross-tenant suite asks: given an id belonging to
 * somebody else's workspace, does the action refuse to touch it? Three bugs in
 * this codebase were permission checked on the workspace and the write done on
 * a bare row id.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const db = {
  workspace:   { findUnique: vi.fn() },
  participant: { findUnique: vi.fn(), update: vi.fn() },
}
vi.mock('@/lib/db', () => ({ db }))

class RedirectError extends Error {
  constructor(public to: string) { super(to) }
}
vi.mock('next/navigation', () => ({
  redirect: (to: string) => { throw new RedirectError(to) },
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth/session', () => ({
  requireUser: async () => ({ id: 'me', email: 'me@example.com', fullName: 'Me', avatarUrl: null }),
}))

const requirePermission = vi.fn(async () => undefined)
vi.mock('@/lib/permissions', () => ({ requirePermission }))

const { approveParticipantAction, rejectParticipantAction } = await import('./actions')

/** A pending registration in the workspace the caller is acting on. */
const withParticipant = (over: Record<string, unknown> = {}) => {
  db.participant.findUnique.mockResolvedValue({
    id: 'p1',
    status: 'PENDING',
    challenge: { workspaceId: 'ws1', slug: 'design-sprint' },
    ...over,
  })
}

async function run(action: typeof approveParticipantAction) {
  try {
    return await action('p1', 'designify')
  } catch (e) {
    if (e instanceof RedirectError) return { success: false, redirected: e.to }
    throw e
  }
}

const newStatus = () => db.participant.update.mock.calls[0]?.[0]?.data?.status

beforeEach(() => {
  vi.clearAllMocks()
  db.workspace.findUnique.mockResolvedValue({ id: 'ws1' })
  withParticipant()
})

describe('approving', () => {
  it('lets a pending participant in', async () => {
    expect((await run(approveParticipantAction)).success).toBe(true)
    expect(newStatus()).toBe('REGISTERED')
  })

  it('asks for participant.manage, not membership alone', async () => {
    await run(approveParticipantAction)
    expect(requirePermission).toHaveBeenCalledWith('me', 'ws1', 'participant.manage')
  })

  it('refuses someone already registered', async () => {
    withParticipant({ status: 'REGISTERED' })
    expect((await run(approveParticipantAction)).success).toBe(false)
    expect(db.participant.update).not.toHaveBeenCalled()
  })

  it('refuses to reinstate someone who dropped out', async () => {
    // Re-approving a DROPPED row would quietly rewrite their history.
    withParticipant({ status: 'DROPPED' })
    expect((await run(approveParticipantAction)).success).toBe(false)
    expect(db.participant.update).not.toHaveBeenCalled()
  })
})

describe('rejecting', () => {
  it('marks a pending participant dropped rather than deleting them', async () => {
    // The registration happened; that is a fact worth keeping.
    expect((await run(rejectParticipantAction)).success).toBe(true)
    expect(newStatus()).toBe('DROPPED')
  })

  it('refuses anyone not awaiting a decision', async () => {
    withParticipant({ status: 'COMPLETED' })
    expect((await run(rejectParticipantAction)).success).toBe(false)
    expect(db.participant.update).not.toHaveBeenCalled()
  })
})

describe('tenant isolation', () => {
  for (const [name, action] of [
    ['approve', approveParticipantAction],
    ['reject',  rejectParticipantAction],
  ] as const) {
    it(`${name} refuses a participant in another workspace`, async () => {
      // Permission was checked against ws1; this row belongs elsewhere.
      withParticipant({ challenge: { workspaceId: 'ws-someone-else', slug: 'theirs' } })
      const result = await run(action)
      expect(result.success).toBe(false)
      expect(db.participant.update).not.toHaveBeenCalled()
    })

    it(`${name} refuses a participant that does not exist`, async () => {
      db.participant.findUnique.mockResolvedValue(null)
      expect((await run(action)).success).toBe(false)
      expect(db.participant.update).not.toHaveBeenCalled()
    })
  }

  it('refuses when the workspace slug is not real', async () => {
    db.workspace.findUnique.mockResolvedValue(null)
    const result = await run(approveParticipantAction)
    expect(result.success).toBe(false)
    expect(requirePermission).not.toHaveBeenCalled()
    expect(db.participant.update).not.toHaveBeenCalled()
  })
})
