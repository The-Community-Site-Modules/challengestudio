/**
 * Submitting work and finishing a challenge (milestone 6).
 *
 * completeStepAction is called from the browser with a step id, so the id is
 * client-supplied and every check on it is the only one there is. Two of these
 * tests exist because the action originally had neither: it never confirmed the
 * step belonged to the challenge in the URL, and it never asked whether the
 * step was unlocked — the day page redirected, but the action underneath it
 * accepted anything.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const db = {
  challenge:     { findFirst: vi.fn() },
  participant:   { findUnique: vi.fn(), update: vi.fn() },
  submission:    { upsert: vi.fn(), count: vi.fn() },
  challengeStep: { count: vi.fn() },
}
vi.mock('@/lib/db', () => ({ db }))

class RedirectError extends Error {}
vi.mock('next/navigation', () => ({
  redirect: (to: string) => { throw new RedirectError(to) },
}))

const auth = { user: { id: 'u1', email: 'ada@example.com' } as { id: string; email: string } | null }
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: auth.user } }) } }),
}))

const { completeStepAction } = await import('./actions')

/** A running challenge whose three steps have all opened. */
const CHALLENGE = {
  id: 'ch1',
  mode: 'COHORT',
  timezone: 'UTC',
  startsAt: new Date('2020-01-01T00:00:00Z'),
  steps: [
    { id: 'st1', order: 0, availableAt: null },
    { id: 'st2', order: 1, availableAt: null },
    { id: 'st3', order: 2, availableAt: null },
  ],
}

const withChallenge = (over: Record<string, unknown> = {}) =>
  db.challenge.findFirst.mockResolvedValue({ ...CHALLENGE, ...over })

const withParticipant = (over: Record<string, unknown> = {}) =>
  db.participant.findUnique.mockResolvedValue({
    id: 'p1', status: 'REGISTERED', registeredAt: new Date('2020-01-01T00:00:00Z'), ...over,
  })

async function submit(stepId = 'st1', data: Record<string, unknown> = { answer: 'done' }) {
  try {
    await completeStepAction('design-sprint', stepId, data)
  } catch (e) {
    if (!(e instanceof RedirectError)) throw e
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  auth.user = { id: 'u1', email: 'ada@example.com' }
  withChallenge()
  withParticipant()
  db.challengeStep.count.mockResolvedValue(3)   // 3 required steps
  db.submission.count.mockResolvedValue(1)      // 1 done so far
})

describe('submitting work', () => {
  it('stores the submission against the participant and step', async () => {
    await submit()
    expect(db.submission.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { participantId_stepId: { participantId: 'p1', stepId: 'st1' } },
      })
    )
  })

  it('strips the participantId helper field before storing', async () => {
    await submit('st1', { answer: 'done', participantId: 'p1' })
    const call = db.submission.upsert.mock.calls[0]?.[0]
    expect(call.create.data).toEqual({ answer: 'done' })
  })

  it('overwrites an earlier answer rather than duplicating it', async () => {
    await submit()
    const call = db.submission.upsert.mock.calls[0]?.[0]
    expect(call.update.data).toEqual({ answer: 'done' })
  })
})

describe('who may submit', () => {
  it('refuses when nobody is signed in', async () => {
    auth.user = null
    await submit()
    expect(db.submission.upsert).not.toHaveBeenCalled()
  })

  it('refuses someone not enrolled', async () => {
    db.participant.findUnique.mockResolvedValue(null)
    await submit()
    expect(db.submission.upsert).not.toHaveBeenCalled()
  })

  it('refuses someone still awaiting approval', async () => {
    withParticipant({ status: 'PENDING' })
    await submit()
    expect(db.submission.upsert).not.toHaveBeenCalled()
  })
})

describe('which step may be submitted', () => {
  it('refuses a step that belongs to another challenge', async () => {
    // The id comes from the client; nothing else checks it.
    await submit('st-from-somewhere-else')
    expect(db.submission.upsert).not.toHaveBeenCalled()
  })

  it('refuses a step that has not unlocked yet', async () => {
    // Day 3 of a challenge that started today. The page would redirect, but
    // the action has to refuse it on its own.
    const today = new Date()
    withChallenge({ startsAt: today })
    withParticipant({ registeredAt: today })
    await submit('st3')
    expect(db.submission.upsert).not.toHaveBeenCalled()
  })

  it('accepts the step that has unlocked', async () => {
    const today = new Date()
    withChallenge({ startsAt: today })
    withParticipant({ registeredAt: today })
    await submit('st1')
    expect(db.submission.upsert).toHaveBeenCalled()
  })

  it('respects an explicit availableAt in the future', async () => {
    withChallenge({
      steps: [{ id: 'st1', order: 0, availableAt: new Date('2999-01-01T00:00:00Z') }],
    })
    await submit('st1')
    expect(db.submission.upsert).not.toHaveBeenCalled()
  })
})

describe('finishing the challenge', () => {
  it('marks the participant complete once every required step is in', async () => {
    db.challengeStep.count.mockResolvedValue(3)
    db.submission.count.mockResolvedValue(3)
    await submit()
    expect(db.participant.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'COMPLETED' }) })
    )
  })

  it('does not complete them while a required step is outstanding', async () => {
    db.challengeStep.count.mockResolvedValue(3)
    db.submission.count.mockResolvedValue(2)
    await submit()
    expect(db.participant.update).not.toHaveBeenCalled()
  })

  it('does not complete a challenge that requires nothing', async () => {
    // 0 of 0 is not an achievement, and would mark everyone finished at once.
    db.challengeStep.count.mockResolvedValue(0)
    db.submission.count.mockResolvedValue(0)
    await submit()
    expect(db.participant.update).not.toHaveBeenCalled()
  })

  it('records when they finished', async () => {
    db.challengeStep.count.mockResolvedValue(1)
    db.submission.count.mockResolvedValue(1)
    await submit()
    const data = db.participant.update.mock.calls[0]?.[0]?.data
    expect(data.completedAt).toBeInstanceOf(Date)
  })
})
