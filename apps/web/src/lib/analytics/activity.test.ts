/**
 * The overview page's activity list (PRD §17.1).
 *
 * What matters here is that the four streams merge into one honest
 * chronology, and that a private submission shows up as an event without its
 * content — the same rule the participant detail page follows.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const db = {
  participant: { findMany: vi.fn() },
  submission:  { findMany: vi.fn() },
  feedPost:    { findMany: vi.fn() },
  feedComment: { findMany: vi.fn() },
}
vi.mock('@/lib/db', () => ({ db }))

const { recentActivity } = await import('./activity')

const profile = (fullName: string | null, email = 'someone@example.com') => ({ fullName, email })

beforeEach(() => {
  vi.clearAllMocks()
  db.participant.findMany.mockResolvedValue([])
  db.submission.findMany.mockResolvedValue([])
  db.feedPost.findMany.mockResolvedValue([])
  db.feedComment.findMany.mockResolvedValue([])
})

describe('recent activity', () => {
  it('is empty for a challenge where nothing has happened', async () => {
    expect(await recentActivity('ch1')).toEqual([])
  })

  it('merges the four streams newest first', async () => {
    db.participant.findMany.mockResolvedValue([
      { id: 'p1', registeredAt: new Date('2026-03-01T09:00:00Z'), profile: profile('Ada') },
    ])
    db.submission.findMany.mockResolvedValue([
      {
        id: 's1', submittedAt: new Date('2026-03-04T09:00:00Z'), isPrivate: false,
        step: { title: 'Day 2' }, participant: { profile: profile('Grace') },
      },
    ])
    db.feedPost.findMany.mockResolvedValue([
      { id: 'f1', createdAt: new Date('2026-03-02T09:00:00Z'), participant: { profile: profile('Ada') } },
    ])
    db.feedComment.findMany.mockResolvedValue([
      { id: 'c1', createdAt: new Date('2026-03-03T09:00:00Z'), participant: { profile: profile('Grace') } },
    ])

    const items = await recentActivity('ch1')
    expect(items.map(i => i.kind)).toEqual(['submitted', 'commented', 'posted', 'registered'])
    expect(items[0]).toMatchObject({ name: 'Grace', detail: 'submitted Day 2' })
  })

  it('names a private submission without carrying its content', async () => {
    db.submission.findMany.mockResolvedValue([
      {
        id: 's1', submittedAt: new Date('2026-03-04T09:00:00Z'), isPrivate: true,
        step: { title: 'Day 2' }, participant: { profile: profile('Grace') },
      },
    ])
    const [item] = await recentActivity('ch1')
    expect(item?.detail).toBe('submitted Day 2 (private)')

    // Same guarantee as the export: the body is never selected in the first place.
    const select = db.submission.findMany.mock.calls[0]?.[0]?.select
    expect(select.data).toBeUndefined()
  })

  it('falls back to the email when someone has no name set', async () => {
    db.participant.findMany.mockResolvedValue([
      { id: 'p1', registeredAt: new Date('2026-03-01T09:00:00Z'), profile: profile(null, 'nameless@example.com') },
    ])
    expect((await recentActivity('ch1'))[0]?.name).toBe('nameless@example.com')
  })

  it('leaves hidden posts out — a moderated post is not activity', async () => {
    await recentActivity('ch1')
    expect(db.feedPost.findMany.mock.calls[0]?.[0]?.where).toMatchObject({ isHidden: false })
    expect(db.feedComment.findMany.mock.calls[0]?.[0]?.where).toMatchObject({
      post: { challengeId: 'ch1', isHidden: false },
    })
  })

  it('caps the merged list at the limit asked for', async () => {
    const many = (n: number, at: string) =>
      Array.from({ length: n }, (_, i) => ({
        id: `x${i}`, registeredAt: new Date(at), profile: profile(`Person ${i}`),
      }))
    db.participant.findMany.mockResolvedValue(many(10, '2026-03-01T09:00:00Z'))
    expect(await recentActivity('ch1', 4)).toHaveLength(4)
  })
})
