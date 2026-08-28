'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { requirePermission, getMembership } from '@/lib/permissions'
import { sendEmail, renderWorkspaceInvitation } from '@/lib/email'
import { WorkspaceRole } from '.prisma/client'
import { checkSlug } from '@/lib/slugs/reserved'

const ROLE_LABELS: Record<WorkspaceRole, string> = {
  OWNER:  'an owner',
  ADMIN:  'an admin',
  MEMBER: 'a member',
}

// ── helpers ───────────────────────────────────────────────────────────────────

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50)
}

/**
 * Validate a client-supplied role string against the enum.
 *
 * `formData.get('role') as WorkspaceRole` is a lie the compiler cannot catch —
 * the value arrives from the network. Returns null for anything unrecognised
 * so callers can reject rather than hand an invalid value to Prisma.
 */
function parseRole(value: FormDataEntryValue | null): WorkspaceRole | null {
  if (typeof value !== 'string') return null
  const upper = value.toUpperCase()
  return upper in WorkspaceRole ? (upper as WorkspaceRole) : null
}

// ── Create Workspace ──────────────────────────────────────────────────────────

export async function createWorkspaceAction(formData: FormData) {
  const user = await requireUser()
  const name = (formData.get('name') as string).trim()

  if (!name) return redirect('/dashboard?error=' + encodeURIComponent('Workspace name is required.'))

  let slug = slugify(name)

  // Some names belong to the product, and some read as the product's own
  // pages. See lib/slugs/reserved.ts.
  const available = checkSlug(slug)
  if (!available.ok) {
    return redirect('/dashboard?error=' + encodeURIComponent(available.error!))
  }

  // ensure slug is unique
  const existing = await db.workspace.findUnique({ where: { slug } })
  if (existing) slug = `${slug}-${Date.now().toString(36)}`

  const workspace = await db.workspace.create({
    data: {
      name,
      slug,
      ownerId: user.id,
      members: {
        create: {
          profileId: user.id,
          role: WorkspaceRole.OWNER,
          joinedAt: new Date(),
        },
      },
    },
  })

  redirect(`/ws/${workspace.slug}`)
}

// ── Update Workspace ──────────────────────────────────────────────────────────

export async function updateWorkspaceAction(workspaceId: string, formData: FormData) {
  const user = await requireUser()
  await requirePermission(user.id, workspaceId, 'workspace.edit')

  const name     = (formData.get('name')     as string).trim()
  const newSlug  = (formData.get('slug')     as string).trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
  const timezone = (formData.get('timezone') as string | null)?.trim() ?? 'UTC'

  // Get current slug for redirect fallback
  const current = await db.workspace.findUnique({ where: { id: workspaceId }, select: { slug: true } })
  const fallbackSlug = current?.slug ?? newSlug

  if (!name)    return redirect(`/ws/${fallbackSlug}/settings?error=` + encodeURIComponent('Name is required.'))
  if (!newSlug) return redirect(`/ws/${fallbackSlug}/settings?error=` + encodeURIComponent('Slug is required.'))

  // Check new slug not taken by another workspace
  const slugConflict = await db.workspace.findFirst({
    where: { slug: newSlug, NOT: { id: workspaceId } },
  })
  if (slugConflict) {
    return redirect(`/ws/${fallbackSlug}/settings?error=` + encodeURIComponent('That URL slug is already taken.'))
  }

  const updated = await db.workspace.update({
    where: { id: workspaceId },
    data: { name, slug: newSlug, timezone },
  })

  revalidatePath(`/ws/${updated.slug}`)
  revalidatePath(`/ws/${updated.slug}/settings`)
  redirect(`/ws/${updated.slug}/settings?saved=true`)
}

// ── Delete Workspace ──────────────────────────────────────────────────────────

export async function deleteWorkspaceAction(workspaceId: string) {
  const user = await requireUser()
  await requirePermission(user.id, workspaceId, 'workspace.delete')

  await db.workspace.delete({ where: { id: workspaceId } })
  redirect('/dashboard?message=' + encodeURIComponent('Workspace deleted.'))
}

// ── Invite Member ─────────────────────────────────────────────────────────────

export async function inviteMemberAction(workspaceId: string, formData: FormData) {
  const user = await requireUser()
  await requirePermission(user.id, workspaceId, 'workspace.team.manage')

  const email = (formData.get('email') as string).trim().toLowerCase()
  const role  = parseRole(formData.get('role')) ?? WorkspaceRole.MEMBER

  const workspace = await db.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    select: { slug: true, name: true },
  })

  // Same ownership rule as updateMemberRoleAction — an admin must not be able
  // to mint a new owner by way of an invitation.
  if (role === WorkspaceRole.OWNER) {
    const actorRole = (await getMembership(user.id, workspaceId))?.role
    if (actorRole !== WorkspaceRole.OWNER) {
      return redirect(`/ws/${workspace.slug}/team?error=` + encodeURIComponent('Only a workspace owner can invite another owner.'))
    }
  }

  // If this person already has an account, add them directly
  const existingProfile = await db.profile.findUnique({
    where: { email },
    select: { id: true },
  })

  if (existingProfile) {
    // Already a member?
    const alreadyMember = await db.workspaceMember.findUnique({
      where: { workspaceId_profileId: { workspaceId, profileId: existingProfile.id } },
    })
    if (alreadyMember) {
      return redirect(`/ws/${workspace.slug}/team?error=` + encodeURIComponent(`${email} is already a member.`))
    }
    await db.workspaceMember.create({
      data: { workspaceId, profileId: existingProfile.id, role, joinedAt: new Date() },
    })
    revalidatePath(`/ws/${workspace.slug}/team`)
    return redirect(`/ws/${workspace.slug}/team?message=` + encodeURIComponent(`${email} added to workspace.`))
  }

  // No account yet — create invitation token
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  const invitation = await db.workspaceInvitation.upsert({
    where: { workspaceId_email: { workspaceId, email } },
    update: { role, invitedById: user.id, expiresAt, acceptedAt: null },
    create: { workspaceId, email, role, invitedById: user.id, expiresAt },
    select: { token: true },
  })

  const result = await sendEmail(
    renderWorkspaceInvitation({
      to: email,
      workspaceName: workspace.name,
      inviterName: user.fullName ?? user.email,
      roleLabel: ROLE_LABELS[role],
      acceptUrl: `${process.env.NEXT_PUBLIC_APP_URL}/auth/invitation/${invitation.token}`,
      expiresAt,
    })
  )

  revalidatePath(`/ws/${workspace.slug}/team`)

  // Be honest about what happened. The invitation row exists either way, but
  // telling someone "invitation sent" when no mail left the building leaves
  // them waiting on an email that is never coming. The pending row carries a
  // Copy link button, so there is a way to act on this rather than a dead end.
  const notice = result.sent
    ? `Invitation sent to ${email}.`
    : `Invitation created for ${email}, but the email could not be sent. Use Copy link on their row to share it directly.`

  redirect(`/ws/${workspace.slug}/team?${result.sent ? 'message' : 'error'}=` + encodeURIComponent(notice))
}

// ── Accept Invitation ─────────────────────────────────────────────────────────

export async function acceptInvitationAction(token: string) {
  const user = await requireUser()

  const invitation = await db.workspaceInvitation.findUnique({
    where: { token },
    include: { workspace: { select: { id: true, slug: true, name: true } } },
  })

  if (!invitation)              return redirect('/auth/login?error=' + encodeURIComponent('Invitation not found or already used.'))
  if (invitation.acceptedAt)    return redirect(`/ws/${invitation.workspace.slug}`)
  if (invitation.expiresAt < new Date()) {
    return redirect('/auth/login?error=' + encodeURIComponent('This invitation has expired. Ask your workspace owner to resend it.'))
  }

  // The token alone must not be enough. It travels by email and can be
  // forwarded, logged, or leaked; binding it to the invited address means a
  // stray link cannot be redeemed by whoever happens to hold it.
  if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
    return redirect('/dashboard?error=' + encodeURIComponent(
      `This invitation was sent to ${invitation.email}. Sign in with that address to accept it.`
    ))
  }

  // Add member
  await db.workspaceMember.upsert({
    where: { workspaceId_profileId: { workspaceId: invitation.workspaceId, profileId: user.id } },
    update: { role: invitation.role, joinedAt: new Date() },
    create: { workspaceId: invitation.workspaceId, profileId: user.id, role: invitation.role, joinedAt: new Date() },
  })

  // Mark invitation accepted
  await db.workspaceInvitation.update({
    where: { token },
    data: { acceptedAt: new Date() },
  })

  redirect(`/ws/${invitation.workspace.slug}`)
}

// ── Remove Member ─────────────────────────────────────────────────────────────

export async function removeMemberAction(workspaceId: string, memberId: string) {
  const user = await requireUser()

  // Scope the lookup to workspaceId. Server action arguments come from the
  // client, so a memberId belonging to another workspace must not resolve —
  // otherwise a team manager here could remove members of a workspace they
  // have no access to.
  const membership = await db.workspaceMember.findFirst({
    where: { id: memberId, workspaceId },
    select: { profileId: true, role: true },
  })
  if (!membership) return

  // Users can always remove themselves; others need team.manage
  const isSelf = membership.profileId === user.id
  if (!isSelf) await requirePermission(user.id, workspaceId, 'workspace.team.manage')

  // Can't remove the last owner
  if (membership.role === WorkspaceRole.OWNER) {
    const ownerCount = await db.workspaceMember.count({
      where: { workspaceId, role: WorkspaceRole.OWNER },
    })
    if (ownerCount <= 1) {
      const ws = await db.workspace.findUnique({ where: { id: workspaceId }, select: { slug: true } })
      return redirect(`/ws/${ws?.slug}/team?error=` + encodeURIComponent('Transfer ownership before removing the last owner.'))
    }
  }

  await db.workspaceMember.delete({ where: { id: memberId } })

  const ws = await db.workspace.findUnique({ where: { id: workspaceId }, select: { slug: true } })
  revalidatePath(`/ws/${ws?.slug}/team`)

  if (isSelf) return redirect('/dashboard')
  redirect(`/ws/${ws?.slug}/team?message=` + encodeURIComponent('Member removed.'))
}

// ── Update Member Role ────────────────────────────────────────────────────────

export async function updateMemberRoleAction(workspaceId: string, memberId: string, formData: FormData) {
  const user = await requireUser()
  await requirePermission(user.id, workspaceId, 'workspace.team.manage')

  const ws = await db.workspace.findUnique({ where: { id: workspaceId }, select: { slug: true } })
  const fail = (msg: string) => redirect(`/ws/${ws?.slug}/team?error=` + encodeURIComponent(msg))

  const role = parseRole(formData.get('role'))
  if (!role) return fail('Unknown role.')

  // Scope to workspaceId — memberId alone is client-supplied and could name a
  // membership in a workspace the caller has no rights over.
  const target = await db.workspaceMember.findFirst({
    where: { id: memberId, workspaceId },
    select: { id: true, role: true },
  })
  if (!target) return fail('Member not found in this workspace.')

  const actorRole = (await getMembership(user.id, workspaceId))?.role

  // Only an owner may grant or revoke ownership. Without this an admin — who
  // holds team.manage — could promote themselves to OWNER and pick up
  // workspace.delete and billing along with it.
  if (role === WorkspaceRole.OWNER && actorRole !== WorkspaceRole.OWNER) {
    return fail('Only a workspace owner can grant ownership.')
  }
  if (target.role === WorkspaceRole.OWNER && actorRole !== WorkspaceRole.OWNER) {
    return fail('Only a workspace owner can change another owner’s role.')
  }

  // Never leave the workspace ownerless.
  if (target.role === WorkspaceRole.OWNER && role !== WorkspaceRole.OWNER) {
    const ownerCount = await db.workspaceMember.count({
      where: { workspaceId, role: WorkspaceRole.OWNER },
    })
    if (ownerCount <= 1) return fail('Promote another owner before changing this role.')
  }

  await db.workspaceMember.update({
    where: { id: target.id },
    data: { role },
  })

  revalidatePath(`/ws/${ws?.slug}/team`)
  redirect(`/ws/${ws?.slug}/team?message=` + encodeURIComponent('Role updated.'))
}

// ── Cancel Invitation ─────────────────────────────────────────────────────────

export async function cancelInvitationAction(workspaceId: string, invitationId: string) {
  const user = await requireUser()
  await requirePermission(user.id, workspaceId, 'workspace.team.manage')

  // deleteMany, not delete: it takes a full where clause, so the invitation is
  // matched on workspaceId too and a foreign id simply deletes nothing.
  await db.workspaceInvitation.deleteMany({ where: { id: invitationId, workspaceId } })

  const ws = await db.workspace.findUnique({ where: { id: workspaceId }, select: { slug: true } })
  revalidatePath(`/ws/${ws?.slug}/team`)
  redirect(`/ws/${ws?.slug}/team?message=` + encodeURIComponent('Invitation cancelled.'))
}
