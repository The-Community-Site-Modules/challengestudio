/**
 * Cross-tenant isolation for the challenge, step and block actions
 * (Build Plan §4 rule 1, PRD §28).
 *
 * Every action here takes two things from the browser: a workspace slug and a
 * row id. The permission check only ever answered the first half — "may this
 * person edit challenges in *this* workspace" — and then wrote to the row id
 * as given. So the owner of one workspace could edit, publish, close or
 * delete another tenant's challenge, and rewrite its steps and content, by
 * sending a foreign id alongside their own slug. Nothing else stood in the
 * way: Prisma connects as the table owner, so Postgres exempts it from
 * row-level security.
 *
 * Each test below sends exactly that request and asserts the write does not
 * happen. `redirect()` throws, so an action that stops shows up as a throw
 * with the destination attached, and one that does not stop shows up as a
 * db.update call that should never have been made.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Doubles ─────────────────────────────────────────────────────────────────

const db = {
  workspace:     { findUnique: vi.fn() },
  challenge:     { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn(), create: vi.fn() },
  challengeStep: {
    findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn(),
    create: vi.fn(), aggregate: vi.fn(), count: vi.fn(),
  },
  contentBlock:  { deleteMany: vi.fn(), createMany: vi.fn() },
  // saveBlocksAction runs its delete-and-recreate in one transaction.
  $transaction:  vi.fn(async (fn: (tx: unknown) => unknown) => fn(db)),
}
vi.mock('@/lib/db', () => ({ db }))

class RedirectError extends Error {
  constructor(public destination: string) { super(`REDIRECT:${destination}`) }
}
vi.mock('next/navigation', () => ({
  redirect: (destination: string) => { throw new RedirectError(destination) },
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

vi.mock('@/lib/auth/session', () => ({
  requireUser: async () => ({ id: 'attacker', email: 'attacker@example.com' }),
}))

// The attacker is a legitimate owner of their own workspace, so every
// permission check passes. That is the point: permission is not ownership.
vi.mock('@/lib/permissions', () => ({
  requirePermission: async () => undefined,
}))

const {
  updateChallengeAction, publishChallengeAction, closeChallengeAction,
  deleteChallengeAction, addStepAction, updateStepAction, deleteStepAction,
  reorderStepsAction, saveBlocksAction,
} = await import('./actions')

// ─── Fixtures ────────────────────────────────────────────────────────────────

/** The workspace the attacker legitimately owns. */
const MINE = { id: 'ws_mine', slug: 'mine' }

/** Ids belonging to somebody else entirely. */
const THEIR_CHALLENGE = 'ch_theirs'
const THEIR_STEP      = 'st_theirs'

const MY_CHALLENGE = 'ch_mine'
const MY_STEP      = 'st_mine'

beforeEach(() => {
  vi.clearAllMocks()
  db.workspace.findUnique.mockResolvedValue(MINE)

  // The scoping query — "this id, in this workspace" — finds nothing for a
  // foreign id, which is exactly how the real database would answer.
  db.challenge.findFirst.mockImplementation(async ({ where }: { where: { id: string; workspaceId: string } }) =>
    where.id === MY_CHALLENGE && where.workspaceId === MINE.id
      ? { id: MY_CHALLENGE, slug: 'my-challenge' }
      : null
  )
  db.challengeStep.findFirst.mockImplementation(async ({ where }: { where: { id: string } }) =>
    where.id === MY_STEP ? { id: MY_STEP, challengeId: MY_CHALLENGE } : null
  )

  db.challenge.update.mockResolvedValue({ id: MY_CHALLENGE, slug: 'my-challenge' })
  db.challenge.findUnique.mockResolvedValue(null)
  db.challengeStep.update.mockResolvedValue({ id: MY_STEP })
  db.challengeStep.aggregate.mockResolvedValue({ _max: { order: 2 } })
  db.challengeStep.count.mockResolvedValue(2)
  db.challengeStep.findMany.mockResolvedValue([])
  db.challengeStep.create.mockResolvedValue({ id: 'new', order: 3, title: 'Day 4 — Untitled' })
})

/** Run an action that should stop, and report where it sent the caller. */
async function refused(run: () => Promise<unknown>): Promise<string> {
  try {
    await run()
  } catch (e) {
    if (e instanceof RedirectError) return e.destination
    throw e
  }
  throw new Error('the action completed when it should have refused')
}

// ─── Challenges ──────────────────────────────────────────────────────────────

describe("another tenant's challenge", () => {
  it('cannot be edited', async () => {
    const to = await refused(() => updateChallengeAction(THEIR_CHALLENGE, MINE.slug, { title: 'Owned' }))
    expect(to).toBe('/ws/mine/challenges')
    expect(db.challenge.update).not.toHaveBeenCalled()
  })

  it('cannot be published', async () => {
    // Give the publish gate a challenge that would sail through it, so the
    // refusal can only come from the ownership check and not from a missing
    // title or an empty step list.
    db.challenge.findUnique.mockResolvedValue({
      title: 'Theirs', slug: 'theirs', description: 'd', promise: 'p',
      startsAt: new Date('2026-04-01T00:00:00Z'), endsAt: null,
      registrationOpensAt: null, registrationClosesAt: null,
      steps: [{ id: 's', isPublished: true, _count: { contentBlocks: 2 } }],
    })

    await refused(() => publishChallengeAction(THEIR_CHALLENGE, MINE.slug))
    expect(db.challenge.update).not.toHaveBeenCalled()
  })

  it('cannot be closed', async () => {
    await refused(() => closeChallengeAction(THEIR_CHALLENGE, MINE.slug))
    expect(db.challenge.update).not.toHaveBeenCalled()
  })

  it('cannot be deleted', async () => {
    await refused(() => deleteChallengeAction(THEIR_CHALLENGE, MINE.slug))
    expect(db.challenge.delete).not.toHaveBeenCalled()
  })

  it('cannot have a step added to it', async () => {
    await refused(() => addStepAction(THEIR_CHALLENGE, MINE.slug))
    expect(db.challengeStep.create).not.toHaveBeenCalled()
  })

  it('is looked up by workspace, not by id alone', async () => {
    await refused(() => closeChallengeAction(THEIR_CHALLENGE, MINE.slug))
    expect(db.challenge.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: THEIR_CHALLENGE, workspaceId: MINE.id } })
    )
  })
})

// ─── Steps and blocks ────────────────────────────────────────────────────────

describe("another tenant's step", () => {
  it('cannot be edited', async () => {
    await refused(() => updateStepAction(THEIR_STEP, MINE.slug, { title: 'Owned' }))
    expect(db.challengeStep.update).not.toHaveBeenCalled()
  })

  it('cannot be deleted', async () => {
    await refused(() => deleteStepAction(THEIR_STEP, MINE.slug))
    expect(db.challengeStep.delete).not.toHaveBeenCalled()
  })

  it('cannot have its content replaced', async () => {
    await refused(() => saveBlocksAction(THEIR_STEP, MINE.slug, [
      { type: 'heading', order: 0, data: { text: 'Owned' }, required: false },
    ]))
    expect(db.contentBlock.deleteMany).not.toHaveBeenCalled()
    expect(db.contentBlock.createMany).not.toHaveBeenCalled()
  })

  it('is reached through its challenge, so ownership is one query', async () => {
    await refused(() => deleteStepAction(THEIR_STEP, MINE.slug))
    expect(db.challengeStep.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: THEIR_STEP, challenge: { workspaceId: MINE.id } },
      })
    )
  })
})

describe('reordering', () => {
  it('does not move a step belonging to another challenge', async () => {
    // The challenge is the caller's own; the array smuggles a foreign id in.
    await reorderStepsAction(MY_CHALLENGE, MINE.slug, [MY_STEP, THEIR_STEP])

    // Every write is filtered by the challenge, so the foreign id matches
    // nothing rather than being reordered.
    for (const call of db.challengeStep.updateMany.mock.calls) {
      expect(call[0].where).toMatchObject({ challengeId: MY_CHALLENGE })
    }
    expect(db.challengeStep.update).not.toHaveBeenCalled()
  })
})

// ─── The other half: the caller's own work still goes through ────────────────

describe('a tenant working in their own workspace', () => {
  it('can edit their own challenge', async () => {
    await updateChallengeAction(MY_CHALLENGE, MINE.slug, { title: 'Renamed' })
    expect(db.challenge.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: MY_CHALLENGE } })
    )
  })

  it('can delete their own challenge', async () => {
    // deleteChallengeAction redirects on success too, so a redirect here means
    // it got all the way through rather than being turned away.
    await refused(() => deleteChallengeAction(MY_CHALLENGE, MINE.slug))
    expect(db.challenge.delete).toHaveBeenCalledWith({ where: { id: MY_CHALLENGE } })
  })

  it('can edit their own step', async () => {
    await updateStepAction(MY_STEP, MINE.slug, { title: 'Day 1' })
    expect(db.challengeStep.update).toHaveBeenCalled()
  })

  it('can replace the content of their own step', async () => {
    await saveBlocksAction(MY_STEP, MINE.slug, [
      { type: 'heading', order: 0, data: { text: 'Welcome' }, required: false },
    ])
    expect(db.contentBlock.deleteMany).toHaveBeenCalledWith({ where: { stepId: MY_STEP } })
    expect(db.contentBlock.createMany).toHaveBeenCalled()
  })

  it('can add a step to their own challenge', async () => {
    await addStepAction(MY_CHALLENGE, MINE.slug)
    expect(db.challengeStep.create).toHaveBeenCalled()
  })
})

// ─── An unknown workspace slug ───────────────────────────────────────────────

describe('a workspace that does not exist', () => {
  it('sends the caller to the dashboard before anything is read', async () => {
    db.workspace.findUnique.mockResolvedValue(null)
    const to = await refused(() => updateChallengeAction(MY_CHALLENGE, 'no-such-workspace', {}))
    expect(to).toBe('/dashboard')
    expect(db.challenge.findFirst).not.toHaveBeenCalled()
  })
})

// ─── Saving blocks is all-or-nothing ─────────────────────────────────────────

describe('saveBlocksAction', () => {
  it('refuses an unknown block type before deleting anything', async () => {
    // It used to delete every block first and then fail on the insert,
    // leaving the step empty.
    const result = await saveBlocksAction(MY_STEP, MINE.slug, [
      { type: 'heading', order: 0, data: {}, required: false },
      { type: 'not_a_block', order: 1, data: {}, required: false },
    ])
    expect(result.success).toBe(false)
    expect(db.contentBlock.deleteMany).not.toHaveBeenCalled()
    expect(db.contentBlock.createMany).not.toHaveBeenCalled()
  })

  it('deletes and recreates inside one transaction', async () => {
    await saveBlocksAction(MY_STEP, MINE.slug, [{ type: 'heading', order: 0, data: {}, required: false }])
    expect(db.$transaction).toHaveBeenCalledTimes(1)
  })
})

// ─── Slugs are unique across workspaces ──────────────────────────────────────

describe('challenge slugs', () => {
  it('refuses a slug another workspace already uses', async () => {
    // /c/<slug> has no workspace in it; a per-workspace check let two tenants
    // share one public URL.
    db.challenge.findFirst.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
      if (where.workspaceId === MINE.id && where.id === MY_CHALLENGE) return { id: MY_CHALLENGE, slug: 'my-challenge' }
      if (where.slug === 'taken' && !('workspaceId' in where)) return { id: 'ch_elsewhere' }
      return null
    })
    const result = await updateChallengeAction(MY_CHALLENGE, MINE.slug, { slug: 'taken' })
    expect(result).toEqual({ error: expect.stringMatching(/taken/) })
    expect(db.challenge.update).not.toHaveBeenCalled()
  })

  it('refuses a slug that cleans down to nothing', async () => {
    const result = await updateChallengeAction(MY_CHALLENGE, MINE.slug, { slug: '!!!' })
    expect(result).toEqual({ error: expect.any(String) })
    expect(db.challenge.update).not.toHaveBeenCalled()
  })
})

// ─── Deleting a step closes the gap ──────────────────────────────────────────

describe('deleteStepAction', () => {
  it('renumbers the steps after the deleted one', async () => {
    // order is the day number in the URL and the unlock offset; a hole made
    // later steps open a day late and broke "next day" links.
    db.challengeStep.findMany.mockResolvedValue([
      { id: 'a', order: 0 }, { id: 'c', order: 2 }, { id: 'd', order: 3 },
    ])
    await deleteStepAction(MY_STEP, MINE.slug)
    expect(db.challengeStep.delete).toHaveBeenCalledWith({ where: { id: MY_STEP } })
    expect(db.challengeStep.update).toHaveBeenCalledTimes(2)
    expect(db.challengeStep.update).toHaveBeenCalledWith({ where: { id: 'c' }, data: { order: 1 } })
    expect(db.challengeStep.update).toHaveBeenCalledWith({ where: { id: 'd' }, data: { order: 2 } })
  })
})

// ─── Mode from the settings page ─────────────────────────────────────────────

describe('challenge mode', () => {
  it.each([
    ['drip', 'DRIP'], ['sprint', 'SPRINT'], ['live_event', 'LIVE_EVENT'],
    ['certification', 'CERTIFICATION'], ['self_paced', 'SELF_PACED'],
    ['DRIP', 'DRIP'], ['habit', 'SPRINT'], ['nonsense', 'SELF_PACED'],
  ])('saves %s as %s', async (sent, stored) => {
    // The settings page sends lower-case enum names; all but two used to
    // fall through to SELF_PACED.
    await updateChallengeAction(MY_CHALLENGE, MINE.slug, { mode: sent })
    expect(db.challenge.update.mock.calls[0]?.[0]?.data?.mode).toBe(stored)
  })

  it('stores an empty timezone as none rather than as ""', async () => {
    await updateChallengeAction(MY_CHALLENGE, MINE.slug, { timezone: '' })
    expect(db.challenge.update.mock.calls[0]?.[0]?.data?.timezone).toBeNull()
  })
})

// ─── Day settings are validated on the server ────────────────────────────────

describe('updateStepAction values', () => {
  it.each([
    [{ pointsXp: -1000 }], [{ pointsXp: 1.5 }], [{ estimatedMinutes: -5 }], [{ title: '   ' }],
  ])('refuses %j without writing', async (patch) => {
    // Negative XP was awarded as-is on completion; a decimal failed on the
    // Int column; a blank title left the day nameless.
    const result = await updateStepAction(MY_STEP, MINE.slug, patch)
    expect(result).toEqual({ error: expect.any(String) })
    expect(db.challengeStep.update).not.toHaveBeenCalled()
  })

  it('accepts zero, null and whole numbers, and trims the title', async () => {
    await updateStepAction(MY_STEP, MINE.slug, { pointsXp: 0, estimatedMinutes: null, title: ' Day 1 ' })
    expect(db.challengeStep.update.mock.calls[0]?.[0]?.data).toMatchObject({
      pointsXp: 0, estimatedMinutes: null, title: 'Day 1',
    })
  })
})
