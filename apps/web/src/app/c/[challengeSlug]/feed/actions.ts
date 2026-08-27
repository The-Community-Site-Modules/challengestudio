'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { awardPoints } from '@/lib/gamification'
import { hasPermission } from '@/lib/permissions'
import { ALLOWED_EMOJI } from './reactions'

/**
 * The challenge feed (milestone 7).
 *
 * Everything here answers the same question first: is the caller an approved
 * participant in *this* challenge? Every id these actions receive comes from
 * the browser, so membership is resolved from the session and the challenge
 * slug in the URL, never from anything the client sends.
 *
 * Moderation hides rather than deletes, so a removed post stays auditable and
 * "who took this down, and when" has an answer.
 */

const MAX_BODY = 2000

interface Actor {
  participantId: string
  challengeId: string
  workspaceId: string
  profileId: string
}

/** Resolve the signed-in participant, or null if they may not take part. */
async function actorFor(challengeSlug: string): Promise<Actor | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const challenge = await db.challenge.findFirst({
    where:  { slug: challengeSlug },
    select: { id: true, workspaceId: true },
  })
  if (!challenge) return null

  const participant = await db.participant.findUnique({
    where:  { challengeId_profileId: { challengeId: challenge.id, profileId: user.id } },
    select: { id: true, status: true },
  })
  // PENDING means not approved yet: they cannot open the challenge, so they
  // cannot post in it either.
  if (!participant || participant.status === 'PENDING') return null

  return {
    participantId: participant.id,
    challengeId:   challenge.id,
    workspaceId:   challenge.workspaceId,
    profileId:     user.id,
  }
}

function refresh(challengeSlug: string) {
  revalidatePath(`/c/${challengeSlug}/feed`)
}

// ─── Posting ─────────────────────────────────────────────────────────────────

export async function createPostAction(challengeSlug: string, body: string, stepId?: string) {
  const actor = await actorFor(challengeSlug)
  if (!actor) return { success: false, error: 'You need to be taking part to post here.' }

  const text = body.trim()
  if (!text)                 return { success: false, error: 'Write something first.' }
  if (text.length > MAX_BODY) return { success: false, error: `Keep it under ${MAX_BODY} characters.` }

  const post = await db.feedPost.create({
    data: {
      challengeId:   actor.challengeId,
      participantId: actor.participantId,
      body:          text,
      ...(stepId ? { stepId } : {}),
    },
    select: { id: true },
  })

  // Capped per day inside awardPoints — posting twenty times in an evening
  // should not out-earn taking part in the challenge itself.
  await awardPoints({
    workspaceId:    actor.workspaceId,
    challengeId:    actor.challengeId,
    participantId:  actor.participantId,
    action:         'feed_posted',
    sourceId:       post.id,
    idempotencyKey: `${actor.participantId}:feed_posted:${post.id}`,
  })

  refresh(challengeSlug)
  return { success: true }
}

export async function createCommentAction(challengeSlug: string, postId: string, body: string) {
  const actor = await actorFor(challengeSlug)
  if (!actor) return { success: false, error: 'You need to be taking part to comment.' }

  const text = body.trim()
  if (!text)                 return { success: false, error: 'Write something first.' }
  if (text.length > MAX_BODY) return { success: false, error: `Keep it under ${MAX_BODY} characters.` }

  // postId comes from the browser; without this a comment could be attached to
  // a post in a different challenge entirely.
  const post = await db.feedPost.findUnique({
    where:  { id: postId },
    select: { challengeId: true, isHidden: true },
  })
  if (!post || post.challengeId !== actor.challengeId) {
    return { success: false, error: 'That post is no longer available.' }
  }
  if (post.isHidden) {
    return { success: false, error: 'That post has been removed.' }
  }

  const comment = await db.feedComment.create({
    data: { postId, participantId: actor.participantId, body: text },
    select: { id: true },
  })

  await awardPoints({
    workspaceId:    actor.workspaceId,
    challengeId:    actor.challengeId,
    participantId:  actor.participantId,
    action:         'comment_given',
    sourceId:       comment.id,
    idempotencyKey: `${actor.participantId}:comment_given:${comment.id}`,
  })

  refresh(challengeSlug)
  return { success: true }
}

// ─── Reacting ────────────────────────────────────────────────────────────────

/**
 * Add or remove one emoji. Clicking the same one twice takes it back, which is
 * what the unique constraint on (post, participant, emoji) is there to allow.
 */
export async function toggleReactionAction(challengeSlug: string, postId: string, emoji: string) {
  const actor = await actorFor(challengeSlug)
  if (!actor) return { success: false, error: 'You need to be taking part to react.' }

  // An open set would let anything through, including text dressed as an emoji.
  if (!(ALLOWED_EMOJI as readonly string[]).includes(emoji)) {
    return { success: false, error: 'That reaction is not available.' }
  }

  const post = await db.feedPost.findUnique({
    where:  { id: postId },
    select: { challengeId: true, isHidden: true },
  })
  if (!post || post.challengeId !== actor.challengeId || post.isHidden) {
    return { success: false, error: 'That post is no longer available.' }
  }

  const existing = await db.reaction.findUnique({
    where: {
      postId_participantId_emoji: { postId, participantId: actor.participantId, emoji },
    },
    select: { id: true },
  })

  if (existing) {
    await db.reaction.delete({ where: { id: existing.id } })
  } else {
    await db.reaction.create({
      data: { postId, participantId: actor.participantId, emoji },
    })
  }

  refresh(challengeSlug)
  return { success: true, on: !existing }
}

// ─── Moderation ──────────────────────────────────────────────────────────────

/**
 * Hide a post or comment.
 *
 * Two people may do this: whoever wrote it, and a workspace moderator. The
 * moderator check is a capability against the challenge's own workspace, so a
 * moderator elsewhere has no say here.
 */
export async function hidePostAction(challengeSlug: string, postId: string) {
  const actor = await actorFor(challengeSlug)
  if (!actor) return { success: false, error: 'Not available.' }

  const post = await db.feedPost.findUnique({
    where:  { id: postId },
    select: { challengeId: true, participantId: true },
  })
  if (!post || post.challengeId !== actor.challengeId) {
    return { success: false, error: 'That post is no longer available.' }
  }

  const isAuthor = post.participantId === actor.participantId
  const canModerate = isAuthor ||
    await hasPermission(actor.profileId, actor.workspaceId, 'community.moderate')
  if (!canModerate) return { success: false, error: 'You cannot remove that post.' }

  await db.feedPost.update({
    where: { id: postId },
    data:  { isHidden: true, hiddenById: actor.profileId, hiddenAt: new Date() },
  })

  refresh(challengeSlug)
  return { success: true }
}

export async function hideCommentAction(challengeSlug: string, commentId: string) {
  const actor = await actorFor(challengeSlug)
  if (!actor) return { success: false, error: 'Not available.' }

  const comment = await db.feedComment.findUnique({
    where:  { id: commentId },
    select: { participantId: true, post: { select: { challengeId: true } } },
  })
  if (!comment || comment.post.challengeId !== actor.challengeId) {
    return { success: false, error: 'That comment is no longer available.' }
  }

  const isAuthor = comment.participantId === actor.participantId
  const canModerate = isAuthor ||
    await hasPermission(actor.profileId, actor.workspaceId, 'community.moderate')
  if (!canModerate) return { success: false, error: 'You cannot remove that comment.' }

  await db.feedComment.update({
    where: { id: commentId },
    data:  { isHidden: true, hiddenById: actor.profileId, hiddenAt: new Date() },
  })

  refresh(challengeSlug)
  return { success: true }
}
