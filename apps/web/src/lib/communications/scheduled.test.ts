/**
 * The scheduled sweep (§6, §15).
 *
 * §6 names the property these mostly defend: "idempotent unlock evaluation
 * (re-running the calculation must never re-fire notifications already sent)".
 * The sweep is expected to run hourly, so every one of its keys has to be
 * stable across runs, and the tests below are mostly about which key it picks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const db = {
  challenge:   { findMany: vi.fn() },
  liveSession: { findMany: vi.fn() },
  participant: { findMany: vi.fn() },
  offer:       { findMany: vi.fn() },
  // The sweeps ask which keys have already been delivered before dispatching,
  // so a steady state costs one query rather than one failed insert each.
  messageDelivery: { findMany: vi.fn() },
}
vi.mock('@/lib/db', () => ({ db }))

interface DispatchArgs {
  trigger: string
  idempotencyKey: string
  values: Record<string, string>
}
const dispatch = vi.fn<(input: DispatchArgs) => Promise<{ status: string }>>(
  async () => ({ status: 'sent' })
)
vi.mock('./send', () => ({ dispatch }))

const {
  sweepChallengeStarting, sweepDayAvailable, sweepSessionReminder,
  sweepInactivityNudge, sweepOfferClosing, sweepAll,
} = await import('./scheduled')

const NOW = new Date('2026-03-10T12:00:00Z')

const person = (id: string) => ({
  id, profileId: `u-${id}`,
  registeredAt: new Date('2026-03-08T00:00:00Z'),
  profile: { email: `${id}@example.com`, fullName: 'Ada Lovelace' },
})

const keys = () => dispatch.mock.calls.map(c => c[0].idempotencyKey)

beforeEach(() => {
  vi.clearAllMocks()
  for (const model of Object.values(db)) model.findMany.mockResolvedValue([])
})

describe('challenge starting soon', () => {
  beforeEach(() => {
    db.challenge.findMany.mockResolvedValue([{
      id: 'ch1', title: 'Design Sprint', startsAt: new Date('2026-03-11T09:00:00Z'),
      workspaceId: 'ws1', workspace: { name: 'Designify' },
      participants: [person('p1'), person('p2')],
    }])
  })

  it('tells every participant once, whatever the run', async () => {
    // Keyed on the participant, not the run, so an hourly sweep in the day
    // before the start does not send twenty-four of these.
    const result = await sweepChallengeStarting(NOW)
    expect(result.sent).toBe(2)
    expect(keys()).toEqual(['p1:challenge_starting', 'p2:challenge_starting'])
  })

  it('only looks at challenges starting inside the window', async () => {
    await sweepChallengeStarting(NOW, 24)
    const where = db.challenge.findMany.mock.calls[0]?.[0]?.where
    expect(where.startsAt.gte).toEqual(NOW)
    expect(where.startsAt.lte).toEqual(new Date('2026-03-11T12:00:00Z'))
  })
})

describe('day available', () => {
  beforeEach(() => {
    db.challenge.findMany.mockResolvedValue([{
      id: 'ch1', slug: 'design-sprint', title: 'Design Sprint',
      mode: 'COHORT', timezone: 'UTC', startsAt: new Date('2026-03-08T00:00:00Z'),
      workspaceId: 'ws1', workspace: { name: 'Designify' },
      steps: [
        { id: 's1', title: 'Day 1', order: 0, availableAt: null },
        { id: 's2', title: 'Day 2', order: 1, availableAt: null },
        { id: 's3', title: 'Day 3', order: 2, availableAt: null },
        { id: 's9', title: 'Day 9', order: 8, availableAt: null },
      ],
      participants: [person('p1')],
    }])
  })

  it('mails only the steps that have actually opened', async () => {
    // Started on the 8th, so by the 10th days 1-3 are open and day 9 is not.
    await sweepDayAvailable(NOW)
    expect(keys()).toEqual([
      'p1:day_available:s1', 'p1:day_available:s2', 'p1:day_available:s3',
    ])
  })

  it('keys per participant per step, so re-running sends nothing new', async () => {
    await sweepDayAvailable(NOW)
    const first = keys()
    dispatch.mockClear()
    await sweepDayAvailable(new Date('2026-03-10T13:00:00Z'))
    expect(keys()).toEqual(first)
  })

  it('skips a challenge with no published steps', async () => {
    db.challenge.findMany.mockResolvedValue([{
      id: 'ch1', slug: 'x', title: 'X', mode: 'COHORT', timezone: 'UTC',
      startsAt: NOW, workspaceId: 'ws1', workspace: { name: 'W' },
      steps: [], participants: [person('p1')],
    }])
    const result = await sweepDayAvailable(NOW)
    expect(result.considered).toBe(0)
    expect(dispatch).not.toHaveBeenCalled()
  })
})

describe('session reminder', () => {
  it('keys on the session, so each one is announced once', async () => {
    db.liveSession.findMany.mockResolvedValue([{
      id: 'sess1', title: 'Kickoff', startsAt: new Date('2026-03-11T09:00:00Z'),
      challenge: {
        id: 'ch1', slug: 'design-sprint', title: 'Design Sprint',
        workspaceId: 'ws1', workspace: { name: 'Designify' },
        participants: [person('p1')],
      },
    }])
    await sweepSessionReminder(NOW)
    expect(keys()).toEqual(['p1:session_reminder:sess1'])
  })

  it('sends the hub link rather than the join link', async () => {
    // §16 asks that join URLs stay off public surfaces; a mailbox is one.
    db.liveSession.findMany.mockResolvedValue([{
      id: 'sess1', title: 'Kickoff', startsAt: new Date('2026-03-11T09:00:00Z'),
      challenge: {
        id: 'ch1', slug: 'design-sprint', title: 'Design Sprint',
        workspaceId: 'ws1', workspace: { name: 'Designify' },
        participants: [person('p1')],
      },
    }])
    await sweepSessionReminder(NOW)
    const values = dispatch.mock.calls[0]![0].values
    expect(values.actionUrl).toContain('/hub')
  })
})

describe('inactivity nudge', () => {
  beforeEach(() => {
    db.participant.findMany.mockResolvedValue([{
      ...person('p1'),
      challenge: {
        id: 'ch1', slug: 'design-sprint', title: 'Design Sprint',
        workspaceId: 'ws1', workspace: { name: 'Designify' },
      },
    }])
  })

  it('asks only for people with nothing submitted lately', async () => {
    await sweepInactivityNudge(NOW, 3)
    const where = db.participant.findMany.mock.calls[0]?.[0]?.where
    expect(where.submissions.none.submittedAt.gte).toEqual(new Date('2026-03-07T12:00:00Z'))
  })

  it('keys on the week, so a long absence is a handful of nudges not a daily one', async () => {
    await sweepInactivityNudge(NOW)
    const key = keys()[0]!
    expect(key.startsWith('p1:inactivity_nudge:')).toBe(true)

    dispatch.mockClear()
    // Six hours later, same week — the same key, so dispatch refuses it.
    await sweepInactivityNudge(new Date('2026-03-10T18:00:00Z'))
    expect(keys()[0]).toBe(key)
  })
})

describe('offer closing', () => {
  it('tells only the people who finished', async () => {
    db.offer.findMany.mockResolvedValue([{
      id: 'o1',
      challenge: {
        id: 'ch1', slug: 'design-sprint', title: 'Design Sprint',
        workspaceId: 'ws1', workspace: { name: 'Designify' },
        participants: [person('p1')],
      },
    }])
    await sweepOfferClosing(NOW)
    // The query itself is what restricts it; this pins that it asks.
    const where = db.offer.findMany.mock.calls[0]?.[0]
    expect(where.select.challenge.select.participants.where.status).toBe('COMPLETED')
    expect(keys()).toEqual(['p1:offer_closing:o1'])
  })

  it('ignores an offer that is switched off', async () => {
    await sweepOfferClosing(NOW)
    expect(db.offer.findMany.mock.calls[0]?.[0]?.where.enabled).toBe(true)
  })
})

describe('counting', () => {
  it('separates sent, duplicate, skipped and failed', async () => {
    db.challenge.findMany.mockResolvedValue([{
      id: 'ch1', title: 'X', startsAt: NOW, workspaceId: 'ws1',
      workspace: { name: 'W' },
      participants: [person('p1'), person('p2'), person('p3'), person('p4')],
    }])
    dispatch
      .mockResolvedValueOnce({ status: 'sent' })
      .mockResolvedValueOnce({ status: 'duplicate' })
      .mockResolvedValueOnce({ status: 'skipped_unsubscribed' })
      .mockResolvedValueOnce({ status: 'failed' })

    const r = await sweepChallengeStarting(NOW)
    expect(r).toMatchObject({ considered: 4, sent: 1, duplicates: 1, skipped: 1, failed: 1 })
  })
})

describe('the whole sweep', () => {
  it('reports one result per scheduled trigger', async () => {
    const results = await sweepAll(NOW)
    expect(results.map(r => r.trigger)).toEqual([
      'challenge_starting', 'day_available', 'session_reminder',
      'inactivity_nudge', 'offer_closing',
    ])
  })
})
