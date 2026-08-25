/**
 * Server-side session helpers.
 * Use these in Server Components, Server Actions, and Route Handlers.
 * Never import in Client Components.
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'

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

  // Try to get profile from DB
  const profile = await db.profile.findUnique({
    where: { id: user.id },
    select: { id: true, email: true, fullName: true, avatarUrl: true },
  })

  // Fallback to auth user data if profile not yet created (race condition on first login)
  return profile ?? {
    id: user.id,
    email: user.email ?? '',
    fullName: user.user_metadata?.full_name ?? null,
    avatarUrl: user.user_metadata?.avatar_url ?? null,
  }
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
