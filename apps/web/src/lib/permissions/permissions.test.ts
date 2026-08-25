import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// The permissions module imports the Prisma client at module load. Stub it so
// these tests never open a connection — the capability tests are pure logic and
// hasPermission's only I/O is the membership lookup, which we control here.
const findUnique = vi.fn()
vi.mock('@/lib/db', () => ({
  db: { workspaceMember: { findUnique: (...args: unknown[]) => findUnique(...args) } },
}))

const {
  ROLE_CAPABILITIES,
  hasPermission,
  requirePermission,
  isPlatformAdmin,
  getPlatformAdminEmails,
} = await import('./index')

beforeEach(() => {
  findUnique.mockReset()
})

// ─── Capability bundles (Build Plan §5) ──────────────────────────────────────

describe('role capability bundles', () => {
  it('gives only the owner the destructive and billing capabilities', () => {
    for (const capability of ['workspace.delete', 'workspace.billing.manage', 'challenge.delete'] as const) {
      expect(ROLE_CAPABILITIES.workspace_owner).toContain(capability)
      expect(ROLE_CAPABILITIES.workspace_admin).not.toContain(capability)
      expect(ROLE_CAPABILITIES.workspace_member).not.toContain(capability)
    }
  })

  it('keeps a plain member out of every challenge-authoring capability', () => {
    const authoring = ROLE_CAPABILITIES.workspace_member.filter((c) => c.startsWith('challenge.'))
    expect(authoring).toEqual([])
  })

  it('does not let a member read other participants or their submissions', () => {
    expect(ROLE_CAPABILITIES.workspace_member).not.toContain('participant.view')
    expect(ROLE_CAPABILITIES.workspace_member).not.toContain('submission.view_all')
    expect(ROLE_CAPABILITIES.workspace_member).not.toContain('submission.view_private')
  })

  it('withholds view_private from admins — only the owner sees private submissions', () => {
    expect(ROLE_CAPABILITIES.workspace_owner).toContain('submission.view_private')
    expect(ROLE_CAPABILITIES.workspace_admin).not.toContain('submission.view_private')
  })

  it('never grants platform.admin through a workspace role', () => {
    // /admin spans every tenant. No workspace membership may reach it.
    for (const capabilities of Object.values(ROLE_CAPABILITIES)) {
      expect(capabilities).not.toContain('platform.admin')
    }
  })
})

// ─── hasPermission ───────────────────────────────────────────────────────────

describe('hasPermission', () => {
  it('denies a user with no membership in the workspace', async () => {
    findUnique.mockResolvedValue(null)
    expect(await hasPermission('user-1', 'ws-1', 'workspace.view')).toBe(false)
  })

  it('denies when either identifier is missing, without querying', async () => {
    expect(await hasPermission('', 'ws-1', 'workspace.view')).toBe(false)
    expect(await hasPermission('user-1', '', 'workspace.view')).toBe(false)
    expect(findUnique).not.toHaveBeenCalled()
  })

  it('scopes the membership lookup to the workspace being asked about', async () => {
    findUnique.mockResolvedValue({ role: 'OWNER' })
    await hasPermission('user-1', 'ws-1', 'workspace.delete')

    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { workspaceId_profileId: { workspaceId: 'ws-1', profileId: 'user-1' } },
      })
    )
  })

  it('maps an ADMIN membership to the admin bundle, not the owner bundle', async () => {
    findUnique.mockResolvedValue({ role: 'ADMIN' })
    expect(await hasPermission('user-1', 'ws-1', 'challenge.publish')).toBe(true)
    expect(await hasPermission('user-1', 'ws-1', 'workspace.delete')).toBe(false)
  })

  it('grants a MEMBER workspace.view but nothing that mutates', async () => {
    findUnique.mockResolvedValue({ role: 'MEMBER' })
    expect(await hasPermission('user-1', 'ws-1', 'workspace.view')).toBe(true)
    expect(await hasPermission('user-1', 'ws-1', 'workspace.edit')).toBe(false)
    expect(await hasPermission('user-1', 'ws-1', 'challenge.create')).toBe(false)
  })
})

describe('requirePermission', () => {
  it('throws when the capability is missing', async () => {
    findUnique.mockResolvedValue({ role: 'MEMBER' })
    await expect(requirePermission('user-1', 'ws-1', 'workspace.delete')).rejects.toThrow(/Forbidden/)
  })

  it('resolves quietly when the capability is held', async () => {
    findUnique.mockResolvedValue({ role: 'OWNER' })
    await expect(requirePermission('user-1', 'ws-1', 'workspace.delete')).resolves.toBeUndefined()
  })
})

// ─── Platform admin allow-list ───────────────────────────────────────────────

describe('isPlatformAdmin', () => {
  const original = process.env.PLATFORM_ADMIN_EMAIL

  afterEach(() => {
    if (original === undefined) delete process.env.PLATFORM_ADMIN_EMAIL
    else process.env.PLATFORM_ADMIN_EMAIL = original
  })

  it('fails closed when the allow-list is unset', () => {
    delete process.env.PLATFORM_ADMIN_EMAIL
    expect(isPlatformAdmin('anyone@example.com')).toBe(false)
  })

  it('fails closed when the allow-list is empty or only separators', () => {
    process.env.PLATFORM_ADMIN_EMAIL = '   '
    expect(isPlatformAdmin('anyone@example.com')).toBe(false)

    process.env.PLATFORM_ADMIN_EMAIL = ',,,'
    expect(isPlatformAdmin('anyone@example.com')).toBe(false)
    expect(getPlatformAdminEmails()).toEqual([])
  })

  it('admits a listed address regardless of case or padding', () => {
    process.env.PLATFORM_ADMIN_EMAIL = ' Owner@Example.com '
    expect(isPlatformAdmin('owner@example.com')).toBe(true)
    expect(isPlatformAdmin('OWNER@EXAMPLE.COM')).toBe(true)
    expect(isPlatformAdmin('  owner@example.com  ')).toBe(true)
  })

  it('supports several addresses separated by commas', () => {
    process.env.PLATFORM_ADMIN_EMAIL = 'a@example.com, b@example.com'
    expect(isPlatformAdmin('a@example.com')).toBe(true)
    expect(isPlatformAdmin('b@example.com')).toBe(true)
    expect(isPlatformAdmin('c@example.com')).toBe(false)
  })

  it('rejects an absent address', () => {
    process.env.PLATFORM_ADMIN_EMAIL = 'owner@example.com'
    expect(isPlatformAdmin(null)).toBe(false)
    expect(isPlatformAdmin(undefined)).toBe(false)
    expect(isPlatformAdmin('')).toBe(false)
  })

  it('does not treat a substring or lookalike as a match', () => {
    process.env.PLATFORM_ADMIN_EMAIL = 'owner@example.com'
    expect(isPlatformAdmin('owner@example.com.attacker.test')).toBe(false)
    expect(isPlatformAdmin('notowner@example.com')).toBe(false)
  })
})
