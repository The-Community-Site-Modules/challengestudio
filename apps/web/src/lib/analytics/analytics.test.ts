/**
 * Analytics and export (PRD §17, §27).
 *
 * Two promises are under test. §27: "creator totals match the underlying
 * registrations, enrollments, and completion records" — so the arithmetic has
 * to be right, including the awkward zero cases where a rate has no
 * denominator. And §17.3: an export must be "designed to avoid unintentionally
 * exposing private submission content" — so the rows carry counts, never
 * bodies, and the tests say so directly.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const db = {
  challenge:     { findUnique: vi.fn() },
  participant:   { findMany: vi.fn() },
  challengeStep: { count: vi.fn() },
  pointsEvent:   { groupBy: vi.fn() },
  auditLog:      { create: vi.fn() },
}
vi.mock('@/lib/db', () => ({ db }))

const { challengeMetrics } = await import('./challenge-metrics')
const { participantExportRows, toCsv, writeExportAudit } = await import('./export')

const NOW = new Date('2026-03-20T12:00:00Z')

/** A challenge with three steps, all long since open. */
const CHALLENGE = {
  id: 'ch1', mode: 'COHORT', timezone: 'UTC',
  startsAt: new Date('2026-03-01T00:00:00Z'),
  steps: [
    { id: 's1', title: 'Day 1', order: 0, availableAt: null, isRequired: true },
    { id: 's2', title: 'Day 2', order: 1, availableAt: null, isRequired: true },
    { id: 's3', title: 'Day 3', order: 2, availableAt: null, isRequired: true },
  ],
  offer: { _count: { clicks: 7 } },
  _count: { liveSessions: 2 },
}

const participant = (over: Record<string, unknown> = {}) => ({
  id: 'p1', status: 'REGISTERED',
  registeredAt: new Date('2026-03-01T00:00:00Z'),
  profile: { fullName: 'Ada Lovelace', email: 'ada@example.com' },
  submissions: [] as { stepId: string; submittedAt: Date; isPrivate?: boolean }[],
  _count: { posts: 0, comments: 0, badgeAwards: 0 },
  ...over,
})

beforeEach(() => {
  vi.clearAllMocks()
  db.challenge.findUnique.mockResolvedValue(CHALLENGE)
  db.participant.findMany.mockResolvedValue([])
  db.challengeStep.count.mockResolvedValue(3)
  db.pointsEvent.groupBy.mockResolvedValue([])
})

describe('rates with nothing to divide by', () => {
  it('reports zeroes for a challenge nobody joined, rather than NaN', async () => {
    const m = await challengeMetrics('ch1', NOW)
    expect(m).toMatchObject({
      registrations: 0, activationRate: 0, completionRate: 0,
      averageDaysCompleted: 0, submissionRate: 0, communityRate: 0,
    })
  })

  it('does not divide by a step nobody has reached', async () => {
    db.challenge.findUnique.mockResolvedValue({
      ...CHALLENGE,
      startsAt: new Date('2099-01-01T00:00:00Z'),   // nothing open yet
    })
    db.participant.findMany.mockResolvedValue([participant()])
    const m = await challengeMetrics('ch1', NOW)
    expect(m.submissionRate).toBe(0)
    expect(m.dayByDay.every(d => d.reached === 0)).toBe(true)
  })
})

describe('the numbers', () => {
  beforeEach(() => {
    db.participant.findMany.mockResolvedValue([
      // Finished everything.
      participant({
        id: 'p1', status: 'COMPLETED',
        submissions: [
          { stepId: 's1', submittedAt: new Date('2026-03-19T10:00:00Z') },
          { stepId: 's2', submittedAt: new Date('2026-03-19T11:00:00Z') },
          { stepId: 's3', submittedAt: new Date('2026-03-19T12:00:00Z') },
        ],
        _count: { posts: 1, comments: 2, badgeAwards: 3 },
      }),
      // Started, then stopped.
      participant({
        id: 'p2',
        submissions: [{ stepId: 's1', submittedAt: new Date('2026-03-02T10:00:00Z') }],
      }),
      // Never did anything.
      participant({ id: 'p3' }),
    ])
  })

  it('counts activation as people who did at least one thing', async () => {
    const m = await challengeMetrics('ch1', NOW)
    expect(m.registrations).toBe(3)
    expect(m.activated).toBe(2)
    expect(m.activationRate).toBe(67)
  })

  it('counts completion from the participant status, not from guesswork', async () => {
    const m = await challengeMetrics('ch1', NOW)
    expect(m.completed).toBe(1)
    expect(m.completionRate).toBe(33)
  })

  it('averages steps completed across everyone, including those at zero', async () => {
    // 3 + 1 + 0 over three people.
    expect((await challengeMetrics('ch1', NOW)).averageDaysCompleted).toBe(1.3)
  })

  it('measures submissions against steps actually reached', async () => {
    // Nine step-openings across three people, four submissions.
    expect((await challengeMetrics('ch1', NOW)).submissionRate).toBe(44)
  })

  it('counts community participation as posting or commenting', async () => {
    const m = await challengeMetrics('ch1', NOW)
    expect(m.communityParticipants).toBe(1)
    expect(m.communityRate).toBe(33)
  })

  it('reports reach and completion for each step', async () => {
    const m = await challengeMetrics('ch1', NOW)
    expect(m.dayByDay[0]).toMatchObject({ order: 0, reached: 3, completed: 2 })
    expect(m.dayByDay[2]).toMatchObject({ order: 2, reached: 3, completed: 1 })
  })

  it('passes through offer clicks and session count', async () => {
    const m = await challengeMetrics('ch1', NOW)
    expect(m.offerClicks).toBe(7)
    expect(m.liveSessions).toBe(2)
  })
})

describe('the at-risk list', () => {
  it('includes someone quiet for three days or more', async () => {
    db.participant.findMany.mockResolvedValue([
      participant({ id: 'p1', submissions: [{ stepId: 's1', submittedAt: new Date('2026-03-10T12:00:00Z') }] }),
    ])
    const m = await challengeMetrics('ch1', NOW)
    expect(m.atRisk).toHaveLength(1)
    expect(m.atRisk[0]).toMatchObject({ participantId: 'p1', daysSinceActivity: 10 })
  })

  it('leaves out someone who submitted today', async () => {
    db.participant.findMany.mockResolvedValue([
      participant({ id: 'p1', submissions: [{ stepId: 's1', submittedAt: NOW }] }),
    ])
    expect((await challengeMetrics('ch1', NOW)).atRisk).toHaveLength(0)
  })

  it('marks someone who never started rather than inventing a date', async () => {
    db.participant.findMany.mockResolvedValue([participant({ id: 'p3' })])
    const [first] = (await challengeMetrics('ch1', NOW)).atRisk
    expect(first?.daysSinceActivity).toBeNull()
  })

  it('leaves out people who finished or dropped out', async () => {
    db.participant.findMany.mockResolvedValue([
      participant({ id: 'p1', status: 'COMPLETED' }),
      participant({ id: 'p2', status: 'DROPPED' }),
    ])
    expect((await challengeMetrics('ch1', NOW)).atRisk).toHaveLength(0)
  })
})

describe('export', () => {
  beforeEach(() => {
    db.participant.findMany.mockResolvedValue([
      participant({
        id: 'p1',
        submissions: [
          { stepId: 's1', submittedAt: new Date('2026-03-10T12:00:00Z'), isPrivate: false },
          { stepId: 's2', submittedAt: new Date('2026-03-11T12:00:00Z'), isPrivate: true },
        ],
        _count: { posts: 2, comments: 4, badgeAwards: 1 },
      }),
    ])
    db.pointsEvent.groupBy.mockResolvedValue([{ participantId: 'p1', _sum: { points: 350 } }])
  })

  it('never reads submission bodies at all', async () => {
    // §17.3: the safest way not to leak private content is not to select it.
    await participantExportRows('ch1')
    const select = db.participant.findMany.mock.calls[0]?.[0]?.select
    expect(select.submissions.select).toEqual({ submittedAt: true, isPrivate: true })
    expect(select.submissions.select.data).toBeUndefined()
  })

  it('reports private submissions as a count, not as content', async () => {
    const [row] = await participantExportRows('ch1')
    expect(row?.privateSubmissions).toBe(1)
    expect(JSON.stringify(row)).not.toContain('SECRET')
  })

  it('carries progress, points and participation', async () => {
    const [row] = await participantExportRows('ch1')
    expect(row).toMatchObject({
      email: 'ada@example.com', stepsCompleted: 2, stepsTotal: 3,
      points: 350, badges: 1, posts: 2, comments: 4,
    })
    expect(row?.lastActivityAt).toBe('2026-03-11T12:00:00.000Z')
  })
})

describe('csv', () => {
  const row = {
    name: 'Ada Lovelace', email: 'ada@example.com', status: 'active',
    registeredAt: '2026-03-01T00:00:00.000Z', lastActivityAt: '',
    stepsCompleted: 2, stepsTotal: 3, privateSubmissions: 1,
    points: 350, badges: 1, posts: 2, comments: 4,
  }

  it('starts with a header row', () => {
    expect(toCsv([]).split('\r\n')[0]).toContain('name,email,status')
  })

  it('quotes a value containing a comma', () => {
    expect(toCsv([{ ...row, name: 'Lovelace, Ada' }])).toContain('"Lovelace, Ada"')
  })

  it('escapes a quote by doubling it', () => {
    expect(toCsv([{ ...row, name: 'Ada "The First" Lovelace' }]))
      .toContain('"Ada ""The First"" Lovelace"')
  })

  it('quotes a value containing a newline rather than breaking the row', () => {
    expect(toCsv([{ ...row, name: 'Ada\nLovelace' }])).toContain('"Ada\nLovelace"')
  })
})

describe('the audit trail', () => {
  it('records who exported what, and how much', async () => {
    // §17.3 asks for exports to be logged; this is the whole of that.
    await writeExportAudit({ workspaceId: 'ws1', actorId: 'me', challengeId: 'ch1', rows: 42 })
    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: 'ws1', actorId: 'me',
        action: 'export.participants', subjectId: 'ch1',
        detail: { rows: 42, format: 'csv' },
      }),
    })
  })
})
