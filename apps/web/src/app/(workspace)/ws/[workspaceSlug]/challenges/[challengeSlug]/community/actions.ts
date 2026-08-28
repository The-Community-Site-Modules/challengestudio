'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { requirePermission } from '@/lib/permissions'

/**
 * Creator-side moderation.
 *
 * The participant feed lets an author remove their own post; this is the other
 * half — a moderator acting on anyone's, and putting something back that was
 * taken down by mistake. Restoring is why hiding never deleted.
 *
 * Ids arrive from the browser, so each is confirmed to belong to the workspace
 * the permission was checked against.
 */

async function authorize(workspaceSlug: string, challengeSlug: string) {
  const user = await requireUser()

  const workspace = await db.workspace.findUnique({
    where:  { slug: workspaceSlug },
    select: { id: true },
  })
  if (!workspace) redirect('/dashboard')

  await requirePermission(user.id, workspace.id, 'community.moderate')

  const challenge = await db.challenge.findUnique({
    where:  { workspaceId_slug: { workspaceId: workspace.id, slug: challengeSlug } },
    select: { id: true },
  })
  if (!challenge) redirect(`/ws/${workspaceSlug}/challenges`)

  return { userId: user.id, workspaceId: workspace.id, challengeId: challenge.id }
}

function refresh(workspaceSlug: string, challengeSlug: string) {
  revalidatePath(`/ws/${workspaceSlug}/challenges/${challengeSlug}/community`)
  revalidatePath(`/c/${challengeSlug}/feed`)
}

export async function moderatePostAction(
  workspaceSlug: string, challengeSlug: string, postId: string, hide: boolean
) {
  const ctx = await authorize(workspaceSlug, challengeSlug)

  const post = await db.feedPost.findUnique({
    where:  { id: postId },
    select: { challengeId: true },
  })
  if (!post || post.challengeId !== ctx.challengeId) {
    return { success: false, error: 'That post is not in this challenge.' }
  }

  await db.feedPost.update({
    where: { id: postId },
    data: hide
      ? { isHidden: true, hiddenById: ctx.userId, hiddenAt: new Date() }
      : { isHidden: false, hiddenById: null, hiddenAt: null },
  })

  refresh(workspaceSlug, challengeSlug)
  return { success: true }
}

export async function moderateCommentAction(
  workspaceSlug: string, challengeSlug: string, commentId: string, hide: boolean
) {
  const ctx = await authorize(workspaceSlug, challengeSlug)

  const comment = await db.feedComment.findUnique({
    where:  { id: commentId },
    select: { post: { select: { challengeId: true } } },
  })
  if (!comment || comment.post.challengeId !== ctx.challengeId) {
    return { success: false, error: 'That comment is not in this challenge.' }
  }

  await db.feedComment.update({
    where: { id: commentId },
    data: hide
      ? { isHidden: true, hiddenById: ctx.userId, hiddenAt: new Date() }
      : { isHidden: false, hiddenById: null, hiddenAt: null },
  })

  refresh(workspaceSlug, challengeSlug)
  return { success: true }
}
