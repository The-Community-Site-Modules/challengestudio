/**
 * Creator-side moderation (milestone 7).
 *
 * The same question as everywhere else: the post id comes from the browser,
 * the permission is checked against the workspace in the URL, so the row must
 * be confirmed to belong to that workspace's challenge before anything is
 * written.
 *
 * Restoring is the half that only exists because hiding never deleted.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const db = {
  workspace:   { findUnique: vi.fn() },
  challenge:   { findUnique: vi.fn() },
  feedPost:    { findUnique: vi.fn(), update: vi.fn() },
  feedComment: { findUnique: vi.fn(), update: vi.fn() },
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
vi.mock('@/lib/permissions', () => ({ requirePermission }))

const { moderatePostAction, moderateCommentAction } = await import('./actions')

async function run(fn: () => Promise<unknown>) {
  try {
    return await fn() as { success: boolean; error?: string }
  } catch (e) {
    if (e instanceof RedirectError) return { success: false, error: 'redirected' }
    throw e
  }
}

const hidePost    = () => run(() => moderatePostAction('designify', 'sprint', 'post1', true))
const restorePost = () => run(() => moderatePostAction('designify', 'sprint', 'post1', false))

beforeEach(() => {
  vi.clearAllMocks()
  db.workspace.findUnique.mockResolvedValue({ id: 'ws1' })
  db.challenge.findUnique.mockResolvedValue({ id: 'ch1' })
  db.feedPost.findUnique.mockResolvedValue({ challengeId: 'ch1' })
  db.feedComment.findUnique.mockResolvedValue({ post: { challengeId: 'ch1' } })
})

describe('hiding', () => {
  it('records who hid it and when', async () => {
    expect((await hidePost()).success).toBe(true)
    const data = db.feedPost.update.mock.calls[0]?.[0]?.data
    expect(data.isHidden).toBe(true)
    expect(data.hiddenById).toBe('me')
    expect(data.hiddenAt).toBeInstanceOf(Date)
  })

  it('asks for community.moderate against the workspace in the URL', async () => {
    await hidePost()
    expect(requirePermission).toHaveBeenCalledWith('me', 'ws1', 'community.moderate')
  })
})

describe('restoring', () => {
  it('clears the removal, not just the flag', async () => {
    // Leaving hiddenById behind would make a restored post look removed to
    // anyone reading the row later.
    expect((await restorePost()).success).toBe(true)
    expect(db.feedPost.update.mock.calls[0]?.[0]?.data).toEqual({
      isHidden: false, hiddenById: null, hiddenAt: null,
    })
  })
})

describe('tenant isolation', () => {
  it('refuses a post from another challenge', async () => {
    db.feedPost.findUnique.mockResolvedValue({ challengeId: 'ch-elsewhere' })
    expect((await hidePost()).success).toBe(false)
    expect(db.feedPost.update).not.toHaveBeenCalled()
  })

  it('refuses a post that does not exist', async () => {
    db.feedPost.findUnique.mockResolvedValue(null)
    expect((await hidePost()).success).toBe(false)
    expect(db.feedPost.update).not.toHaveBeenCalled()
  })

  it('refuses when the workspace slug is not real', async () => {
    db.workspace.findUnique.mockResolvedValue(null)
    expect((await hidePost()).success).toBe(false)
    expect(requirePermission).not.toHaveBeenCalled()
  })

  it('refuses when the challenge is not in that workspace', async () => {
    db.challenge.findUnique.mockResolvedValue(null)
    expect((await hidePost()).success).toBe(false)
    expect(db.feedPost.update).not.toHaveBeenCalled()
  })

  it('applies the same checks to comments', async () => {
    db.feedComment.findUnique.mockResolvedValue({ post: { challengeId: 'ch-elsewhere' } })
    const result = await run(() => moderateCommentAction('designify', 'sprint', 'c1', true))
    expect(result.success).toBe(false)
    expect(db.feedComment.update).not.toHaveBeenCalled()
  })
})
