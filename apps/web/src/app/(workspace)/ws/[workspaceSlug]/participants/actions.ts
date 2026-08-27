'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { requirePermission } from '@/lib/permissions'

/**
 * Deciding who gets into an approval-gated challenge.
 *
 * Challenge.requiresApproval parks new registrations on PENDING. Until now
 * nothing could move them off it, so turning the setting on locked people out
 * permanently — the queue existed with no door at the end of it.
 */

/**
 * Resolve the participant and check the caller may act on them.
 *
 * The participant id arrives from the client, so it is never trusted on its
 * own: the permission is checked against the workspace in the URL and the row
 * is then confirmed to belong to that same workspace. Checking one and writing
 * to the other is exactly how the three cross-tenant bugs in this codebase
 * happened.
 */
async function authorize(participantId: string, workspaceSlug: string) {
  const user = await requireUser()

  const workspace = await db.workspace.findUnique({
    where:  { slug: workspaceSlug },
    select: { id: true },
  })
  if (!workspace) redirect('/dashboard')

  await requirePermission(user.id, workspace.id, 'participant.manage')

  const participant = await db.participant.findUnique({
    where:  { id: participantId },
    select: {
      id: true, status: true,
      challenge: { select: { workspaceId: true, slug: true } },
    },
  })

  if (!participant || participant.challenge.workspaceId !== workspace.id) {
    redirect(`/ws/${workspaceSlug}/participants`)
  }

  return participant
}

function done(workspaceSlug: string, challengeSlug: string) {
  revalidatePath(`/ws/${workspaceSlug}/participants`)
  revalidatePath(`/ws/${workspaceSlug}/challenges/${challengeSlug}/participants`)
}

/** Let a waiting participant in. */
export async function approveParticipantAction(participantId: string, workspaceSlug: string) {
  const participant = await authorize(participantId, workspaceSlug)

  // Only a pending registration is waiting on a decision. Re-approving someone
  // who has since dropped out or finished would quietly rewrite their history.
  if (participant.status !== 'PENDING') {
    return { success: false, error: 'That registration is not awaiting approval.' }
  }

  await db.participant.update({
    where: { id: participant.id },
    data:  { status: 'REGISTERED' as never },
  })

  done(workspaceSlug, participant.challenge.slug)
  return { success: true }
}

/**
 * Turn a waiting participant away.
 *
 * DROPPED rather than deleting the row: the person registered, and that is a
 * fact about the challenge worth keeping. It also stops the same address
 * re-registering into a fresh PENDING row on the next attempt.
 */
export async function rejectParticipantAction(participantId: string, workspaceSlug: string) {
  const participant = await authorize(participantId, workspaceSlug)

  if (participant.status !== 'PENDING') {
    return { success: false, error: 'That registration is not awaiting approval.' }
  }

  await db.participant.update({
    where: { id: participant.id },
    data:  { status: 'DROPPED' as never },
  })

  done(workspaceSlug, participant.challenge.slug)
  return { success: true }
}
