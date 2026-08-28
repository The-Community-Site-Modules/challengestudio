'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { setUnsubscribed } from '@/lib/communications'

/**
 * Notification preferences (PRD §15.2).
 *
 * Scoped to one workspace on purpose. The workspaceId comes from the browser,
 * so it is confirmed to be a workspace this person actually has a relationship
 * with — otherwise anyone could write preference rows for workspaces they have
 * never heard of.
 */
export async function setWorkspacePreferenceAction(workspaceId: string, unsubscribed: boolean) {
  const user = await requireUser()

  // A relationship means either taking part in one of its challenges or being
  // on the team. Anything else has no business having a preference row.
  const [participation, membership] = await Promise.all([
    db.participant.findFirst({
      where:  { profileId: user.id, challenge: { workspaceId } },
      select: { id: true },
    }),
    db.workspaceMember.findFirst({
      where:  { profileId: user.id, workspaceId },
      select: { id: true },
    }),
  ])
  if (!participation && !membership) {
    return { success: false, error: 'That is not one of your workspaces.' }
  }

  await setUnsubscribed(user.id, workspaceId, unsubscribed)
  revalidatePath('/account/notifications')
  return { success: true }
}
