/**
 * The challenge feed (milestone 7).
 *
 * Every id these actions take — post, comment, emoji — arrives from the
 * browser. So the question each test asks is whether the action confirms the
 * thing belongs to the challenge in the URL, and whether the caller is
 * actually taking part in it. Membership is resolved from the session, never
 * from anything the client sends.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const db = {
  challenge:   { findFirst: vi.fn() },
  participant: { findUnique: vi.fn() },
  feedPost:    { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  feedComment: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  reaction:    { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
}
vi.mock('@/lib/db', () => ({ db }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const auth = { user: { id: 'u1' } as { id: string } | null }
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: auth.user } }) } }),
}))

const awardPoints = vi.fn(async () => ({ awarded: true, points: 15 }))
vi.mock('@/lib/gamification', () => ({ awardPoints }))

const hasPermission = vi.fn(async () => false)
vi.mock('@/lib/permissions', () => ({ hasPermission }))

const {
  createPostAction, createCommentAction, toggleReactionAction,
  hidePostAction, hideCommentAction,
} = await import('./actions')

const SLUG = 'design-sprint'

beforeEach(() => {
  vi.clearAllMocks()
  auth.user = { id: 'u1' }
  hasPermission.mockResolvedValue(false)
  db.challenge.findFirst.mockResolvedValue({ id: 'ch1', workspaceId: 'ws1' })
  db.participant.findUnique.mockResolvedValue({ id: 'p1', status: 'REGISTERED' })
  db.feedPost.create.mockResolvedValue({ id: 'post1' })
  db.feedComment.create.mockResolvedValue({ id: 'c1' })
  db.feedPost.findUnique.mockResolvedValue({
    id: 'post1', challengeId: 'ch1', participantId: 'p1', isHidden: false,
  })
  db.reaction.findUnique.mockResolvedValue(null)
})

describe('who may take part', () => {
  it('refuses someone not signed in', async () => {
    auth.user = null
    expect((await createPostAction(SLUG, 'hello')).success).toBe(false)
    expect(db.feedPost.create).not.toHaveBeenCalled()
  })

  it('refuses someone not enrolled', async () => {
    db.participant.findUnique.mockResolvedValue(null)
    expect((await createPostAction(SLUG, 'hello')).success).toBe(false)
    expect(db.feedPost.create).not.toHaveBeenCalled()
  })

  it('refuses someone still awaiting approval', async () => {
    // They cannot open the challenge, so they cannot post in it either.
    db.participant.findUnique.mockResolvedValue({ id: 'p1', status: 'PENDING' })
    expect((await createPostAction(SLUG, 'hello')).success).toBe(false)
    expect(db.feedPost.create).not.toHaveBeenCalled()
  })
})

describe('posting', () => {
  it('stores the post against the participant', async () => {
    expect((await createPostAction(SLUG, '  first day done  ')).success).toBe(true)
    expect(db.feedPost.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          challengeId: 'ch1', participantId: 'p1', body: 'first day done',
        }),
      })
    )
  })

  it('refuses an empty post', async () => {
    expect((await createPostAction(SLUG, '   ')).success).toBe(false)
    expect(db.feedPost.create).not.toHaveBeenCalled()
  })

  it('refuses one over the length limit', async () => {
    expect((await createPostAction(SLUG, 'x'.repeat(2001))).success).toBe(false)
    expect(db.feedPost.create).not.toHaveBeenCalled()
  })

  it('awards points once, keyed to the post', async () => {
    await createPostAction(SLUG, 'hello')
    expect(awardPoints).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'feed_posted', idempotencyKey: 'p1:feed_posted:post1',
      })
    )
  })
})

describe('commenting', () => {
  it('refuses a post belonging to another challenge', async () => {
    db.feedPost.findUnique.mockResolvedValue({ challengeId: 'ch-elsewhere', isHidden: false })
    expect((await createCommentAction(SLUG, 'post1', 'nice')).success).toBe(false)
    expect(db.feedComment.create).not.toHaveBeenCalled()
  })

  it('refuses a post that has been removed', async () => {
    db.feedPost.findUnique.mockResolvedValue({ challengeId: 'ch1', isHidden: true })
    expect((await createCommentAction(SLUG, 'post1', 'nice')).success).toBe(false)
    expect(db.feedComment.create).not.toHaveBeenCalled()
  })

  it('stores a valid comment and awards for it', async () => {
    expect((await createCommentAction(SLUG, 'post1', 'nice work')).success).toBe(true)
    expect(awardPoints).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'comment_given' })
    )
  })
})

describe('reacting', () => {
  it('adds a reaction that is not there', async () => {
    const result = await toggleReactionAction(SLUG, 'post1', '🔥')
    expect(result).toEqual({ success: true, on: true })
    expect(db.reaction.create).toHaveBeenCalled()
  })

  it('takes back one that is', async () => {
    db.reaction.findUnique.mockResolvedValue({ id: 'r1' })
    const result = await toggleReactionAction(SLUG, 'post1', '🔥')
    expect(result).toEqual({ success: true, on: false })
    expect(db.reaction.delete).toHaveBeenCalledWith({ where: { id: 'r1' } })
  })

  it('refuses an emoji outside the allowed set', async () => {
    // Otherwise the column takes arbitrary text dressed as a reaction.
    expect((await toggleReactionAction(SLUG, 'post1', '<script>')).success).toBe(false)
    expect(db.reaction.create).not.toHaveBeenCalled()
  })

  it('refuses a post in another challenge', async () => {
    db.feedPost.findUnique.mockResolvedValue({ challengeId: 'ch-elsewhere', isHidden: false })
    expect((await toggleReactionAction(SLUG, 'post1', '🔥')).success).toBe(false)
    expect(db.reaction.create).not.toHaveBeenCalled()
  })
})

describe('moderation', () => {
  it('lets the author hide their own post', async () => {
    db.feedPost.findUnique.mockResolvedValue({ challengeId: 'ch1', participantId: 'p1' })
    expect((await hidePostAction(SLUG, 'post1')).success).toBe(true)
    expect(db.feedPost.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isHidden: true }) })
    )
  })

  it('refuses another participant with no moderator capability', async () => {
    db.feedPost.findUnique.mockResolvedValue({ challengeId: 'ch1', participantId: 'p-someone-else' })
    expect((await hidePostAction(SLUG, 'post1')).success).toBe(false)
    expect(db.feedPost.update).not.toHaveBeenCalled()
  })

  it('lets a moderator hide somebody else’s post', async () => {
    db.feedPost.findUnique.mockResolvedValue({ challengeId: 'ch1', participantId: 'p-someone-else' })
    hasPermission.mockResolvedValue(true)
    expect((await hidePostAction(SLUG, 'post1')).success).toBe(true)
    expect(hasPermission).toHaveBeenCalledWith('u1', 'ws1', 'community.moderate')
  })

  it('records who hid it and when, rather than deleting', async () => {
    db.feedPost.findUnique.mockResolvedValue({ challengeId: 'ch1', participantId: 'p1' })
    await hidePostAction(SLUG, 'post1')
    const data = db.feedPost.update.mock.calls[0]?.[0]?.data
    expect(data.hiddenById).toBe('u1')
    expect(data.hiddenAt).toBeInstanceOf(Date)
  })

  it('refuses to hide a post in another challenge', async () => {
    db.feedPost.findUnique.mockResolvedValue({ challengeId: 'ch-elsewhere', participantId: 'p1' })
    expect((await hidePostAction(SLUG, 'post1')).success).toBe(false)
    expect(db.feedPost.update).not.toHaveBeenCalled()
  })

  it('applies the same rules to comments', async () => {
    db.feedComment.findUnique.mockResolvedValue({
      participantId: 'p-someone-else', post: { challengeId: 'ch1' },
    })
    expect((await hideCommentAction(SLUG, 'c1')).success).toBe(false)

    hasPermission.mockResolvedValue(true)
    expect((await hideCommentAction(SLUG, 'c1')).success).toBe(true)
  })
})
