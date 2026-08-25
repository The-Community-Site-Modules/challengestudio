/**
 * Server-side session helpers.
 * Use these in Server Components, Server Actions, and Route Handlers.
 * Never import in Client Components.
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { isPlatformAdmin } from '@/lib/permissions'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionUser {
  id: string
  email: string
  fullName: string | null
  avatarUrl: string | null
}

// ─── getCurrentUser ───────────────────────────────────────────────────────────

/**
 * Returns the currently authenticated user's profile, or null if not signed in.
 * Does NOT redirect — use requireUser() for protected pages.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const profile = await db.profile.findUnique({
    where: { id: user.id },
    select: { id: true, email: true, fullName: true, avatarUrl: true },
  })
  if (profile) return profile

  // No profiles row for this authenticated user.
  //
  // The on_auth_user_created trigger normally creates it, but it cannot cover
  // everything: accounts that existed before the trigger was installed, a
  // failed trigger, or a restored auth schema all land here.
  //
  // Create the row rather than returning the auth metadata as a stand-in.
  // Every tenant table carries a foreign key to profiles, so handing back an
  // id with no row behind it does not avoid the problem — it defers it to a
  // foreign key violation at the first write, far from the real cause.
  return ensureProfile({
    id: user.id,
    email: user.email ?? null,
    fullName: (user.user_metadata?.full_name as string | undefined) ?? null,
    avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? null,
  })
}

/**
 * Create the profiles row for an authenticated user, or return the existing one.
 *
 * Idempotent, so it is safe against the race where two requests arrive before
 * the trigger has committed.
 */
async function ensureProfile(input: {
  id: string
  email: string | null
  fullName: string | null
  avatarUrl: string | null
}): Promise<SessionUser> {
  // profiles.email is NOT NULL and unique. Supabase permits an account with no
  // email (phone sign-in), which this app does not offer — but if one appears,
  // derive a stable placeholder rather than crashing on the insert.
  const email = input.email ?? `${input.id}@no-email.local`
  const select = { id: true, email: true, fullName: true, avatarUrl: true } as const

  try {
    return await db.profile.upsert({
      where:  { id: input.id },
      update: {},
      create: { id: input.id, email, fullName: input.fullName, avatarUrl: input.avatarUrl },
      select,
    })
  } catch (error) {
    if (!isUniqueEmailViolation(error)) throw error
    return reclaimProfileByEmail({ ...input, email }, select)
  }
}

/** Prisma P2002 — a unique constraint failed, and the field was email. */
function isUniqueEmailViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const e = error as { code?: string; meta?: { target?: unknown } }
  if (e.code !== 'P2002') return false
  const target = e.meta?.target
  return Array.isArray(target) ? target.includes('email') : target === 'email'
}

/**
 * A profiles row already holds this email under a different id.
 *
 * That means the row was left behind by an account that no longer exists —
 * profiles.id is text and auth.users.id is uuid, so no foreign key ties them,
 * and before the on_auth_user_deleted trigger existed, deleting an account left
 * its profile in place. Signing up again with the same address then collided
 * with the leftover row.
 *
 * Move the surviving row onto the new id rather than deleting it: every foreign
 * key into profiles is ON UPDATE CASCADE, so any workspaces and memberships
 * follow, and the person gets their data back instead of losing it.
 *
 * Guarded, because handing one account's data to another is not something to do
 * on a guess. If a live auth user still owns that row, this is a genuine
 * conflict and should surface rather than resolve itself quietly.
 */
async function reclaimProfileByEmail(
  input: { id: string; email: string; fullName: string | null; avatarUrl: string | null },
  select: { id: true; email: true; fullName: true; avatarUrl: true }
): Promise<SessionUser> {
  const existing = await db.profile.findUnique({
    where: { email: input.email },
    select: { id: true },
  })
  if (!existing) {
    // The colliding row vanished between the insert and this read — a
    // concurrent request already dealt with it. Retrying the upsert is enough.
    return db.profile.upsert({
      where:  { id: input.id },
      update: {},
      create: { id: input.id, email: input.email, fullName: input.fullName, avatarUrl: input.avatarUrl },
      select,
    })
  }

  const stillLive = await db.$queryRaw<Array<{ one: number }>>`
    SELECT 1 AS one FROM auth.users WHERE id::text = ${existing.id} LIMIT 1
  `
  if (stillLive.length > 0) {
    throw new Error(
      `Cannot create a profile for ${input.id}: ${input.email} already belongs to active account ${existing.id}.`
    )
  }

  return db.profile.update({
    where: { id: existing.id },
    data:  { id: input.id, fullName: input.fullName, avatarUrl: input.avatarUrl },
    select,
  })
}

// ─── requireUser ─────────────────────────────────────────────────────────────

/**
 * Returns the current user, redirecting to /auth/login if not signed in.
 * Use this at the top of any protected Server Component or Server Action.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/auth/login?message=' + encodeURIComponent('Please sign in to continue.'))
  }
  return user
}

// ─── requirePlatformAdmin ─────────────────────────────────────────────────────

/**
 * Returns the current user, redirecting away unless they are a platform admin.
 *
 * Use at the top of every /admin route. Middleware already blocks anonymous
 * requests to /admin, but middleware only sees the session cookie — this is the
 * authoritative check and the one that must not be skipped.
 */
export async function requirePlatformAdmin(): Promise<SessionUser> {
  const user = await requireUser()
  if (!isPlatformAdmin(user.email)) {
    redirect('/dashboard?error=' + encodeURIComponent('You do not have access to that area.'))
  }
  return user
}

// ─── requireWorkspaceMember ───────────────────────────────────────────────────

/**
 * Resolves a workspaceSlug to a workspace record, verifies the current user
 * is a member, and returns both the user and workspace.
 *
 * Redirects to /dashboard if:
 * - User is not signed in
 * - Workspace does not exist
 * - User is not a member of the workspace
 */
export async function requireWorkspaceMember(workspaceSlug: string) {
  const user = await requireUser()

  const workspace = await db.workspace.findUnique({
    where: { slug: workspaceSlug },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      logoUrl: true,
      ownerId: true,
    },
  })

  if (!workspace) {
    redirect('/dashboard')
  }

  const membership = await db.workspaceMember.findUnique({
    where: { workspaceId_profileId: { workspaceId: workspace.id, profileId: user.id } },
    select: { role: true },
  })

  if (!membership) {
    redirect('/dashboard')
  }

  return { user, workspace, role: membership.role }
}

// ─── getUserWorkspaces ────────────────────────────────────────────────────────

/**
 * Returns all workspaces the current user is a member of.
 * Returns empty array if not signed in.
 */
export async function getUserWorkspaces(userId: string) {
  return db.workspaceMember.findMany({
    where: { profileId: userId },
    include: {
      workspace: {
        select: {
          id: true,
          slug: true,
          name: true,
          logoUrl: true,
          _count: { select: { challenges: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })
}
