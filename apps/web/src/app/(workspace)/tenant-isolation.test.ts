/**
 * Cross-tenant isolation tests for the workspace server actions.
 *
 * Build Plan §4 rule 1: every tenant-owned row carries a workspace_id and must
 * be queried through it. §28 asks for cross-tenant isolation coverage.
 *
 * Why this matters more than usual here: Prisma connects as the table owner, so
 * Postgres exempts it from row-level security (see
 * prisma/migrations/fix_invitation_rls.sql). RLS defends the PostgREST surface,
 * not these queries. For anything the app does itself, the scoping below is the
 * only thing standing between tenants.
 *
 * Server action arguments arrive from the client, so every test asks the same
 * question: given an id that belongs to somebody else's workspace, does the
 * action refuse to touch it?
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Doubles ─────────────────────────────────────────────────────────────────

const db = {
  workspace:           { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), findFirst: vi.fn() },
  workspaceMember:     { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn(), create: vi.fn(), count: vi.fn(), upsert: vi.fn() },
  workspaceInvitation: { deleteMany: vi.fn(), delete: vi.fn(), upsert: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  profile:             { findUnique: vi.fn() },
}
vi.mock('@/lib/db', () => ({ db }))

// redirect() throws in Next so control never continues past it. Model that:
// a thrown RedirectError with the destination attached lets tests assert both
// that the action stopped and where it sent the caller.
class RedirectError extends Error {
  constructor(public destination: string) {
    super(`REDIRECT:${destination}`)
  }
}
vi.mock('next/navigation', () => ({
  redirect: (destination: string) => { throw new RedirectError(destination) },
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const currentUser = { id: 'actor', email: 'actor@example.com', fullName: 'Actor', avatarUrl: null }
vi.mock('@/lib/auth/session', () => ({
  requireUser: async () => currentUser,
}))

const requirePermission = vi.fn()
const getMembership = vi.fn()
vi.mock('@/lib/permissions', () => ({
  requirePermission: (...a: unknown[]) => requirePermission(...a),
  getMembership: (...a: unknown[]) => getMembership(...a),
}))

const sendEmail = vi.fn(async (..._args: unknown[]) => ({ sent: true, provider: 'resend' as const }))
vi.mock('@/lib/email', () => ({
  sendEmail: (...a: unknown[]) => sendEmail(...a),
  renderWorkspaceInvitation: (v: Record<string, unknown>) => ({ ...v, subject: 's', html: 'h', text: 't' }),
}))

const {
  removeMemberAction,
  updateMemberRoleAction,
  cancelInvitationAction,
  acceptInvitationAction,
  inviteMemberAction,
} = await import('./actions')

/** Run an action and return the path it redirected to, or null if it did not. */
async function redirectOf(run: () => Promise<unknown>): Promise<string | null> {
  try {
    await run()
    return null
  } catch (error) {
    if (error instanceof RedirectError) return error.destination
    throw error
  }
}

const OUR_WS = 'ws-ours'
const form = (entries: Record<string, string>) => {
  const fd = new FormData()
  for (const [k, v] of Object.entries(entries)) fd.set(k, v)
  return fd
}

/**
 * A findFirst that behaves like the database rather than always returning the
 * canned row. Given a set of rows, it honours the where clause — so a query
 * that forgets to filter by workspaceId gets a match it should not have, and
 * the assertion downstream fails. A mock that returns null no matter what would
 * pass against the unscoped query too, and prove nothing.
 */
function seedMemberships(rows: Array<{ id: string; workspaceId: string; profileId: string; role: string }>) {
  db.workspaceMember.findFirst.mockImplementation(async (args: { where: Record<string, unknown> }) => {
    const where = args.where
    const match = rows.find((row) =>
      Object.entries(where).every(([key, value]) => row[key as keyof typeof row] === value)
    )
    return match ?? null
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  requirePermission.mockResolvedValue(undefined)
  getMembership.mockResolvedValue({ role: 'OWNER' })
  db.workspace.findUnique.mockResolvedValue({ slug: 'ours' })
  db.workspace.findUniqueOrThrow.mockResolvedValue({ slug: 'ours', name: 'Ours' })
})

// ─── removeMemberAction ──────────────────────────────────────────────────────

describe('removeMemberAction', () => {
  it('scopes the membership lookup by workspaceId', async () => {
    db.workspaceMember.findFirst.mockResolvedValue(null)
    await redirectOf(() => removeMemberAction(OUR_WS, 'member-from-elsewhere'))

    expect(db.workspaceMember.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'member-from-elsewhere', workspaceId: OUR_WS },
      })
    )
  })

  it('deletes nothing when the member belongs to another workspace', async () => {
    // The row exists — in someone else's tenant. Only the workspaceId filter
    // keeps it out of reach.
    seedMemberships([
      { id: 'victim', workspaceId: 'ws-theirs', profileId: 'their-user', role: 'ADMIN' },
    ])

    await redirectOf(() => removeMemberAction(OUR_WS, 'victim'))

    expect(db.workspaceMember.delete).not.toHaveBeenCalled()
  })

  it('removes a member that really is in this workspace', async () => {
    db.workspaceMember.findFirst.mockResolvedValue({ profileId: 'someone', role: 'MEMBER' })
    await redirectOf(() => removeMemberAction(OUR_WS, 'member-1'))

    expect(db.workspaceMember.delete).toHaveBeenCalledWith({ where: { id: 'member-1' } })
  })

  it('lets a user remove their own membership without team.manage', async () => {
    db.workspaceMember.findFirst.mockResolvedValue({ profileId: currentUser.id, role: 'MEMBER' })
    await redirectOf(() => removeMemberAction(OUR_WS, 'my-membership'))

    expect(requirePermission).not.toHaveBeenCalled()
    expect(db.workspaceMember.delete).toHaveBeenCalled()
  })

  it('refuses to remove the last remaining owner', async () => {
    db.workspaceMember.findFirst.mockResolvedValue({ profileId: 'other', role: 'OWNER' })
    db.workspaceMember.count.mockResolvedValue(1)

    const to = await redirectOf(() => removeMemberAction(OUR_WS, 'the-owner'))

    expect(db.workspaceMember.delete).not.toHaveBeenCalled()
    expect(to).toContain('error=')
  })
})

// ─── updateMemberRoleAction ──────────────────────────────────────────────────

describe('updateMemberRoleAction', () => {
  it('scopes the member lookup by workspaceId', async () => {
    db.workspaceMember.findFirst.mockResolvedValue(null)
    await redirectOf(() => updateMemberRoleAction(OUR_WS, 'foreign-member', form({ role: 'ADMIN' })))

    expect(db.workspaceMember.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'foreign-member', workspaceId: OUR_WS } })
    )
  })

  it('updates nothing when the member belongs to another workspace', async () => {
    seedMemberships([
      { id: 'victim', workspaceId: 'ws-theirs', profileId: 'their-user', role: 'MEMBER' },
    ])

    const to = await redirectOf(() => updateMemberRoleAction(OUR_WS, 'victim', form({ role: 'ADMIN' })))

    expect(db.workspaceMember.update).not.toHaveBeenCalled()
    expect(to).toContain('error=')
  })

  it('stops an admin from promoting anyone to owner', async () => {
    // The actor holds team.manage, so the capability check passes — the
    // ownership rule is what has to stop this.
    getMembership.mockResolvedValue({ role: 'ADMIN' })
    db.workspaceMember.findFirst.mockResolvedValue({ id: 'm1', role: 'MEMBER' })

    const to = await redirectOf(() => updateMemberRoleAction(OUR_WS, 'm1', form({ role: 'OWNER' })))

    expect(db.workspaceMember.update).not.toHaveBeenCalled()
    expect(to).toContain('error=')
  })

  it('stops an admin from promoting themselves to owner', async () => {
    getMembership.mockResolvedValue({ role: 'ADMIN' })
    db.workspaceMember.findFirst.mockResolvedValue({ id: 'self', role: 'ADMIN' })

    await redirectOf(() => updateMemberRoleAction(OUR_WS, 'self', form({ role: 'OWNER' })))

    expect(db.workspaceMember.update).not.toHaveBeenCalled()
  })

  it('stops an admin from demoting an existing owner', async () => {
    getMembership.mockResolvedValue({ role: 'ADMIN' })
    db.workspaceMember.findFirst.mockResolvedValue({ id: 'm1', role: 'OWNER' })

    await redirectOf(() => updateMemberRoleAction(OUR_WS, 'm1', form({ role: 'MEMBER' })))

    expect(db.workspaceMember.update).not.toHaveBeenCalled()
  })

  it('lets an owner grant ownership', async () => {
    getMembership.mockResolvedValue({ role: 'OWNER' })
    db.workspaceMember.findFirst.mockResolvedValue({ id: 'm1', role: 'MEMBER' })

    await redirectOf(() => updateMemberRoleAction(OUR_WS, 'm1', form({ role: 'OWNER' })))

    expect(db.workspaceMember.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'm1' }, data: { role: 'OWNER' } })
    )
  })

  it('refuses to demote the last owner', async () => {
    getMembership.mockResolvedValue({ role: 'OWNER' })
    db.workspaceMember.findFirst.mockResolvedValue({ id: 'm1', role: 'OWNER' })
    db.workspaceMember.count.mockResolvedValue(1)

    await redirectOf(() => updateMemberRoleAction(OUR_WS, 'm1', form({ role: 'ADMIN' })))

    expect(db.workspaceMember.update).not.toHaveBeenCalled()
  })

  it('rejects a role string that is not in the enum', async () => {
    db.workspaceMember.findFirst.mockResolvedValue({ id: 'm1', role: 'MEMBER' })
    const to = await redirectOf(() => updateMemberRoleAction(OUR_WS, 'm1', form({ role: 'SUPERADMIN' })))

    expect(db.workspaceMember.update).not.toHaveBeenCalled()
    expect(to).toContain('error=')
  })
})

// ─── cancelInvitationAction ──────────────────────────────────────────────────

describe('cancelInvitationAction', () => {
  it('matches the invitation on workspaceId as well as id', async () => {
    db.workspaceInvitation.deleteMany.mockResolvedValue({ count: 0 })
    await redirectOf(() => cancelInvitationAction(OUR_WS, 'foreign-invite'))

    expect(db.workspaceInvitation.deleteMany).toHaveBeenCalledWith({
      where: { id: 'foreign-invite', workspaceId: OUR_WS },
    })
    // The unscoped single-row delete must not be used here.
    expect(db.workspaceInvitation.delete).not.toHaveBeenCalled()
  })
})

// ─── acceptInvitationAction ──────────────────────────────────────────────────

describe('acceptInvitationAction', () => {
  const invitation = (over: Record<string, unknown> = {}) => ({
    email: 'invited@example.com',
    role: 'ADMIN',
    workspaceId: 'ws-theirs',
    acceptedAt: null,
    expiresAt: new Date(Date.now() + 86_400_000),
    workspace: { id: 'ws-theirs', slug: 'theirs', name: 'Theirs' },
    ...over,
  })

  it('refuses a token addressed to a different email', async () => {
    // The whole chain this closes: a leaked or guessed token is worthless
    // unless you also control the invited mailbox.
    db.workspaceInvitation.findUnique.mockResolvedValue(invitation())

    const to = await redirectOf(() => acceptInvitationAction('leaked-token'))

    expect(db.workspaceMember.upsert).not.toHaveBeenCalled()
    expect(db.workspaceInvitation.update).not.toHaveBeenCalled()
    expect(to).toContain('error=')
  })

  it('refuses an expired invitation', async () => {
    db.workspaceInvitation.findUnique.mockResolvedValue(
      invitation({ email: currentUser.email, expiresAt: new Date(Date.now() - 1000) })
    )

    const to = await redirectOf(() => acceptInvitationAction('old-token'))
    expect(to).toContain('error=')
  })

  it('refuses an unknown token', async () => {
    db.workspaceInvitation.findUnique.mockResolvedValue(null)

    const to = await redirectOf(() => acceptInvitationAction('nope'))
    expect(to).toContain('error=')
  })

  it('compares the address case-insensitively', async () => {
    db.workspaceInvitation.findUnique.mockResolvedValue(invitation({ email: 'ACTOR@EXAMPLE.COM' }))
    db.workspaceInvitation.update.mockResolvedValue({})

    await redirectOf(() => acceptInvitationAction('good-token'))

    // Reaching the membership write means the email check passed.
    expect(db.workspaceMember.upsert).toHaveBeenCalled()
  })
})

// ─── inviteMemberAction ──────────────────────────────────────────────────────

describe('inviteMemberAction', () => {
  it('stops an admin from inviting a new owner', async () => {
    getMembership.mockResolvedValue({ role: 'ADMIN' })

    const to = await redirectOf(() =>
      inviteMemberAction(OUR_WS, form({ email: 'new@example.com', role: 'OWNER' }))
    )

    expect(db.workspaceInvitation.upsert).not.toHaveBeenCalled()
    expect(db.workspaceMember.create).not.toHaveBeenCalled()
    expect(to).toContain('error=')
  })

  it('falls back to MEMBER for an unrecognised role rather than throwing', async () => {
    db.profile.findUnique.mockResolvedValue(null)
    db.workspaceInvitation.upsert.mockResolvedValue({ token: 'tok' })

    await redirectOf(() =>
      inviteMemberAction(OUR_WS, form({ email: 'new@example.com', role: 'wizard' }))
    )

    expect(db.workspaceInvitation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ role: 'MEMBER' }) })
    )
  })

  it('reports failure when the invitation email could not be sent', async () => {
    db.profile.findUnique.mockResolvedValue(null)
    db.workspaceInvitation.upsert.mockResolvedValue({ token: 'tok' })
    sendEmail.mockResolvedValue({ sent: false, provider: 'console' as never })

    const to = await redirectOf(() =>
      inviteMemberAction(OUR_WS, form({ email: 'new@example.com', role: 'MEMBER' }))
    )

    // The row still exists, but the operator must not be told mail went out.
    expect(db.workspaceInvitation.upsert).toHaveBeenCalled()
    expect(to).toContain('error=')
  })
})
