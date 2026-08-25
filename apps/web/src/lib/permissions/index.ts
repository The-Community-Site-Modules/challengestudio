/**
 * Capability-based authorization — PRD §7.1
 *
 * DESIGN:
 * - All checks happen server-side (Server Actions, Route Handlers only)
 * - Code never checks role names — it checks capability strings
 * - DB roles (OWNER/ADMIN/MEMBER) map to app roles via DB_ROLE_MAP
 * - workspace_id always included in queries for tenant isolation
 */

import { db } from '@/lib/db'
import type { WorkspaceRole as DbRole } from '.prisma/client'

// ─── Capability type ──────────────────────────────────────────────────────────

export type Capability =
  | 'workspace.view'
  | 'workspace.edit'
  | 'workspace.branding.manage'
  | 'workspace.team.manage'
  | 'workspace.billing.manage'
  | 'workspace.export'
  | 'workspace.delete'
  | 'challenge.create'
  | 'challenge.edit'
  | 'challenge.publish'
  | 'challenge.close'
  | 'challenge.delete'
  | 'challenge.preview'
  | 'participant.view'
  | 'participant.manage'
  | 'participant.export'
  | 'submission.view_all'
  | 'submission.view_private'
  | 'submission.review'
  | 'analytics.view'
  | 'analytics.export'
  | 'community.moderate'
  | 'community.post'
  | 'session.manage'
  | 'integration.manage'
  | 'platform.admin'

// App-level role names (richer than the 3 DB roles)
export type AppRole =
  | 'workspace_owner'
  | 'workspace_admin'
  | 'workspace_member'

// Map DB enum → app role
const DB_ROLE_MAP: Record<DbRole, AppRole> = {
  OWNER:  'workspace_owner',
  ADMIN:  'workspace_admin',
  MEMBER: 'workspace_member',
}

// Capabilities per app role
export const ROLE_CAPABILITIES: Record<AppRole, Capability[]> = {
  workspace_owner: [
    'workspace.view', 'workspace.edit', 'workspace.branding.manage',
    'workspace.team.manage', 'workspace.billing.manage', 'workspace.export',
    'workspace.delete', 'challenge.create', 'challenge.edit', 'challenge.publish',
    'challenge.close', 'challenge.delete', 'challenge.preview',
    'participant.view', 'participant.manage', 'participant.export',
    'submission.view_all', 'submission.view_private', 'submission.review',
    'analytics.view', 'analytics.export', 'community.moderate', 'community.post',
    'session.manage', 'integration.manage',
  ],
  workspace_admin: [
    'workspace.view', 'workspace.edit', 'challenge.create', 'challenge.edit',
    'challenge.publish', 'challenge.close', 'challenge.preview',
    'participant.view', 'participant.manage',
    'submission.view_all', 'submission.review',
    'analytics.view', 'community.moderate', 'community.post', 'session.manage',
    'workspace.team.manage',
  ],
  workspace_member: [
    'workspace.view',
    'community.post',
  ],
}

// ─── Core check ───────────────────────────────────────────────────────────────

/**
 * Check if a user has a capability within a workspace.
 * Queries the DB for the membership record, maps role, checks capabilities.
 *
 * @returns true if allowed, false otherwise (never throws for auth reasons)
 */
export async function hasPermission(
  userId: string,
  workspaceId: string,
  capability: Capability
): Promise<boolean> {
  if (!userId || !workspaceId) return false

  const membership = await db.workspaceMember.findUnique({
    where: { workspaceId_profileId: { workspaceId, profileId: userId } },
    select: { role: true },
  })

  if (!membership) return false

  const appRole = DB_ROLE_MAP[membership.role]
  return ROLE_CAPABILITIES[appRole].includes(capability)
}

/**
 * Throw a 403-style error if the user lacks the required capability.
 * Use at the top of every Server Action that mutates workspace data.
 */
export async function requirePermission(
  userId: string,
  workspaceId: string,
  capability: Capability
): Promise<void> {
  const allowed = await hasPermission(userId, workspaceId, capability)
  if (!allowed) {
    throw new Error(`Forbidden: missing capability "${capability}"`)
  }
}

/**
 * Get the membership record for a user+workspace, or null if not a member.
 */
export async function getMembership(userId: string, workspaceId: string) {
  return db.workspaceMember.findUnique({
    where: { workspaceId_profileId: { workspaceId, profileId: userId } },
    select: { role: true, joinedAt: true },
  })
}
