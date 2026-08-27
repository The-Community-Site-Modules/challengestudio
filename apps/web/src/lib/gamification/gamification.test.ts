/**
 * Points and badges (Build Plan §28: "point idempotency").
 *
 * The ledger is append-only and awarding is idempotent at the database level.
 * These pin down that a repeat award adds nothing, that social actions stop
 * earning once the daily cap is reached, and that badge rules do not hand out
 * anything for a challenge with no steps in it.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const db = {
  pointsEvent: { create: vi.fn(), count: vi.fn(), aggregate: vi.fn(), groupBy: vi.fn() },
}
vi.mock('@/lib/db', () => ({ db }))

const { awardPoints, totalPoints, POINT_VALUES } = await import('./points')
const { earnedBadgeKeys, badgeByKey, BADGES } = await import('./badges')

/** Prisma's unique-constraint failure, which is how a repeat award surfaces. */
class UniqueViolation extends Error {
  code = 'P2002'
}

const award = (over: Record<string, unknown> = {}) =>
  awardPoints({
    workspaceId: 'ws1', challengeId: 'ch1', participantId: 'p1',
    action: 'day_completed', sourceId: 'st1',
    ...over,
  } as Parameters<typeof awardPoints>[0])

beforeEach(() => {
  vi.clearAllMocks()
  db.pointsEvent.count.mockResolvedValue(0)
  db.pointsEvent.create.mockResolvedValue({})
})

describe('awarding points', () => {
  it('writes a ledger row worth the action', async () => {
    const result = await award()
    expect(result).toEqual({ awarded: true, points: POINT_VALUES.day_completed })
    expect(db.pointsEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'day_completed', points: 100 }),
      })
    )
  })

  it('derives an idempotency key from the participant, action and source', async () => {
    await award()
    const data = db.pointsEvent.create.mock.calls[0]?.[0]?.data
    expect(data.idempotencyKey).toBe('p1:day_completed:st1')
  })

  it('lets the caller supply its own key for actions that repeat', async () => {
    await award({ action: 'feed_posted', sourceId: 'post9', idempotencyKey: 'custom-1' })
    expect(db.pointsEvent.create.mock.calls[0]?.[0]?.data.idempotencyKey).toBe('custom-1')
  })
})

describe('idempotency', () => {
  it('awards nothing the second time the same thing happens', async () => {
    // The database refuses the duplicate; that is the mechanism working.
    db.pointsEvent.create.mockRejectedValue(new UniqueViolation())
    expect(await award()).toEqual({ awarded: false, points: 0, reason: 'duplicate' })
  })

  it('does not swallow a real database failure', async () => {
    db.pointsEvent.create.mockRejectedValue(new Error('connection lost'))
    await expect(award()).rejects.toThrow('connection lost')
  })
})

describe('daily caps', () => {
  it('stops awarding posts once the cap is reached', async () => {
    db.pointsEvent.count.mockResolvedValue(3)
    expect(await award({ action: 'feed_posted', sourceId: 'post4' }))
      .toEqual({ awarded: false, points: 0, reason: 'daily_cap' })
    expect(db.pointsEvent.create).not.toHaveBeenCalled()
  })

  it('still awards below the cap', async () => {
    db.pointsEvent.count.mockResolvedValue(2)
    expect((await award({ action: 'feed_posted', sourceId: 'post3' })).awarded).toBe(true)
  })

  it('counts only today, from the start of the UTC day', async () => {
    const now = new Date('2026-03-05T18:30:00Z')
    await award({ action: 'comment_given', sourceId: 'c1', now })
    const where = db.pointsEvent.count.mock.calls[0]?.[0]?.where
    expect(where.createdAt.gte.toISOString()).toBe('2026-03-05T00:00:00.000Z')
  })

  it('does not cap completing a day — there are only so many days', async () => {
    db.pointsEvent.count.mockResolvedValue(999)
    expect((await award({ action: 'day_completed' })).awarded).toBe(true)
    // No cap means no count query at all.
    expect(db.pointsEvent.count).not.toHaveBeenCalled()
  })
})

describe('totals', () => {
  it('sums the ledger rather than reading a counter', async () => {
    db.pointsEvent.aggregate.mockResolvedValue({ _sum: { points: 275 } })
    expect(await totalPoints('p1')).toBe(275)
  })

  it('reads zero for someone with no events', async () => {
    db.pointsEvent.aggregate.mockResolvedValue({ _sum: { points: null } })
    expect(await totalPoints('p1')).toBe(0)
  })
})

describe('badges', () => {
  const snapshot = (over: Partial<Parameters<typeof earnedBadgeKeys>[0]> = {}) => ({
    completedSteps: 0, totalSteps: 10, streak: 0, posts: 0, comments: 0, ...over,
  })

  it('gives nothing for having done nothing', () => {
    expect(earnedBadgeKeys(snapshot())).toEqual([])
  })

  it('gives the first step on the first step', () => {
    expect(earnedBadgeKeys(snapshot({ completedSteps: 1 }))).toContain('first_step')
  })

  it('gives halfway at exactly half', () => {
    expect(earnedBadgeKeys(snapshot({ completedSteps: 5 }))).toContain('halfway')
    expect(earnedBadgeKeys(snapshot({ completedSteps: 4 }))).not.toContain('halfway')
  })

  it('gives the finisher badge only when everything is done', () => {
    expect(earnedBadgeKeys(snapshot({ completedSteps: 9 }))).not.toContain('finisher')
    expect(earnedBadgeKeys(snapshot({ completedSteps: 10 }))).toContain('finisher')
  })

  it('awards nothing progress-based when the challenge requires nothing', () => {
    // 0 of 0 is not an achievement; without the guard everyone would be a
    // finisher the moment they enrolled.
    const keys = earnedBadgeKeys(snapshot({ totalSteps: 0, completedSteps: 0 }))
    expect(keys).not.toContain('halfway')
    expect(keys).not.toContain('finisher')
  })

  it('stacks streak badges as the streak grows', () => {
    expect(earnedBadgeKeys(snapshot({ streak: 3 }))).toEqual(['streak_3'])
    expect(earnedBadgeKeys(snapshot({ streak: 7 }))).toEqual(['streak_3', 'streak_7'])
  })

  it('rewards taking part in the feed', () => {
    expect(earnedBadgeKeys(snapshot({ posts: 1 }))).toContain('first_post')
    expect(earnedBadgeKeys(snapshot({ comments: 5 }))).toContain('encourager')
    expect(earnedBadgeKeys(snapshot({ comments: 4 }))).not.toContain('encourager')
  })

  it('can look a badge up for display', () => {
    expect(badgeByKey('finisher')?.name).toBe('Finisher')
    expect(badgeByKey('nonsense')).toBeUndefined()
  })

  it('has a unique key for every badge', () => {
    expect(new Set(BADGES.map((b) => b.key)).size).toBe(BADGES.length)
  })
})
