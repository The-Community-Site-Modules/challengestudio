'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { requirePermission } from '@/lib/permissions'
import { WorkspaceRole } from '.prisma/client'

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

// ── Create Workspace ──────────────────────────────────────────────────────────

export async function createWorkspaceAction(formData: FormData) {
  const user = await requireUser()
  const name = (formData.get('name') as string).trim()

  if (!name) return redirect('/dashboard?error=' + encodeURIComponent('Workspace name is required.'))

  let slug = slugify(name)

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

  const email   = (formData.get('email') as string).trim().toLowerCase()
  const roleRaw = (formData.get('role')  as string) ?? 'MEMBER'
  const role    = (roleRaw.toUpperCase() as WorkspaceRole) || WorkspaceRole.MEMBER

  const workspace = await db.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    select: { slug: true, name: true },
  })

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

  await db.workspaceInvitation.upsert({
    where: { workspaceId_email: { workspaceId, email } },
    update: { role, invitedById: user.id, expiresAt, acceptedAt: null },
    create: { workspaceId, email, role, invitedById: user.id, expiresAt },
  })

  // TODO (Milestone 8): send invitation email via Resend
  // await sendInvitationEmail({ email, workspaceName: workspace.name, token, inviterName: user.fullName })

  revalidatePath(`/ws/${workspace.slug}/team`)
  redirect(`/ws/${workspace.slug}/team?message=` + encodeURIComponent(`Invitation sent to ${email}.`))
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

  // Users can always remove themselves; others need team.manage
  const membership = await db.workspaceMember.findUnique({
    where: { id: memberId },
    select: { profileId: true, role: true },
  })
  if (!membership) return

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

  const roleRaw = formData.get('role') as string
  const role = roleRaw.toUpperCase() as WorkspaceRole

  await db.workspaceMember.update({
    where: { id: memberId },
    data: { role },
  })

  const ws = await db.workspace.findUnique({ where: { id: workspaceId }, select: { slug: true } })
  revalidatePath(`/ws/${ws?.slug}/team`)
  redirect(`/ws/${ws?.slug}/team?message=` + encodeURIComponent('Role updated.'))
}

// ── Cancel Invitation ─────────────────────────────────────────────────────────

export async function cancelInvitationAction(workspaceId: string, invitationId: string) {
  const user = await requireUser()
  await requirePermission(user.id, workspaceId, 'workspace.team.manage')

  await db.workspaceInvitation.delete({ where: { id: invitationId } })

  const ws = await db.workspace.findUnique({ where: { id: workspaceId }, select: { slug: true } })
  revalidatePath(`/ws/${ws?.slug}/team`)
  redirect(`/ws/${ws?.slug}/team?message=` + encodeURIComponent('Invitation cancelled.'))
}
