/**
 * getCurrentUser must never hand back a user id with no profiles row behind it.
 *
 * Every tenant table carries a foreign key to profiles, so a phantom user does
 * not avoid the problem — it defers it to workspaces_owner_id_fkey at the first
 * write, a long way from the real cause. The on_auth_user_created trigger is
 * the normal path; this is the safety net for accounts that predate it, a
 * failed trigger, or a restored auth schema.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const profile = { findUnique: vi.fn(), upsert: vi.fn() }
vi.mock('@/lib/db', () => ({
  db: {
    profile,
    workspace: { findUnique: vi.fn() },
    workspaceMember: { findUnique: vi.fn(), findMany: vi.fn() },
  },
}))

let authUser: Record<string, unknown> | null = null
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: authUser } }) } }),
}))

class RedirectError extends Error {}
vi.mock('next/navigation', () => ({
  redirect: (to: string) => { throw new RedirectError(to) },
}))

const { getCurrentUser } = await import('./session')

beforeEach(() => {
  vi.clearAllMocks()
  authUser = null
  // upsert echoes back what it was asked to create, like the real client.
  profile.upsert.mockImplementation(async (args: { create: Record<string, unknown> }) => ({
    id: args.create.id,
    email: args.create.email,
    fullName: args.create.fullName,
    avatarUrl: args.create.avatarUrl,
  }))
})

describe('getCurrentUser', () => {
  it('returns null when nobody is signed in', async () => {
    authUser = null
    expect(await getCurrentUser()).toBeNull()
    expect(profile.upsert).not.toHaveBeenCalled()
  })

  it('returns the existing profile without writing', async () => {
    authUser = { id: 'u1', email: 'a@example.com' }
    profile.findUnique.mockResolvedValue({
      id: 'u1', email: 'a@example.com', fullName: 'A', avatarUrl: null,
    })

    const user = await getCurrentUser()

    expect(user).toEqual({ id: 'u1', email: 'a@example.com', fullName: 'A', avatarUrl: null })
    // The common path must stay a single read.
    expect(profile.upsert).not.toHaveBeenCalled()
  })

  it('creates the profile when the trigger did not', async () => {
    authUser = {
      id: 'u2',
      email: 'b@example.com',
      user_metadata: { full_name: 'B', avatar_url: 'https://img.example/b.png' },
    }
    profile.findUnique.mockResolvedValue(null)

    const user = await getCurrentUser()

    expect(profile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u2' },
        create: expect.objectContaining({
          id: 'u2',
          email: 'b@example.com',
          fullName: 'B',
          avatarUrl: 'https://img.example/b.png',
        }),
      })
    )
    expect(user?.id).toBe('u2')
  })

  it('upserts rather than inserts, so a racing request cannot collide', async () => {
    authUser = { id: 'u3', email: 'c@example.com' }
    profile.findUnique.mockResolvedValue(null)

    await getCurrentUser()

    // update:{} means "leave the winner's row alone" — two requests arriving
    // together both succeed instead of one hitting a duplicate key.
    expect(profile.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: {} }))
  })

  it('substitutes a placeholder when the account has no email', async () => {
    // profiles.email is NOT NULL and unique. Supabase allows an email-less
    // account; the insert must not be what discovers that.
    authUser = { id: 'u4', email: null }
    profile.findUnique.mockResolvedValue(null)

    const user = await getCurrentUser()

    expect(user?.email).toBe('u4@no-email.local')
    expect(user?.email).toBeTruthy()
  })

  it('tolerates missing user_metadata', async () => {
    authUser = { id: 'u5', email: 'd@example.com' }
    profile.findUnique.mockResolvedValue(null)

    const user = await getCurrentUser()

    expect(user?.fullName).toBeNull()
    expect(user?.avatarUrl).toBeNull()
  })
})
