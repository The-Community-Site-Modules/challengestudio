'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { requirePermission, hasPermission } from '@/lib/permissions'
import { dispatch } from '@/lib/communications'

/**
 * Reviewing a participant's work (PRD §15's submission_feedback trigger).
 *
 * Two capabilities are in play and they are not the same thing: seeing
 * submissions is `submission.view_all`, and seeing the ones a participant
 * marked private is `submission.view_private` (PRD §27 — private work is for
 * the participant and authorised facilitators only). Leaving feedback is
 * `submission.review`.
 */
const MAX_FEEDBACK = 5000

async function authorize(workspaceSlug: string, challengeSlug: string) {
  const user = await requireUser()

  const workspace = await db.workspace.findUnique({
    where:  { slug: workspaceSlug },
    select: { id: true, name: true },
  })
  if (!workspace) redirect('/dashboard')

  await requirePermission(user.id, workspace.id, 'submission.review')

  const challenge = await db.challenge.findUnique({
    where:  { workspaceId_slug: { workspaceId: workspace.id, slug: challengeSlug } },
    select: { id: true, slug: true, title: true },
  })
  if (!challenge) redirect(`/ws/${workspaceSlug}/challenges`)

  return { user, workspaceId: workspace.id, workspaceName: workspace.name, challenge }
}

export async function reviewSubmissionAction(
  workspaceSlug: string,
  challengeSlug: string,
  submissionId: string,
  feedback: string
) {
  const { user, workspaceId, workspaceName, challenge } = await authorize(workspaceSlug, challengeSlug)

  const text = feedback.trim()
  if (!text) return { success: false, error: 'Write something before sending it.' }
  if (text.length > MAX_FEEDBACK) {
    return { success: false, error: `Keep feedback under ${MAX_FEEDBACK} characters.` }
  }

  // The id comes from the browser, so the row has to be confirmed to belong to
  // this challenge before anything is written to it.
  const submission = await db.submission.findUnique({
    where:  { id: submissionId },
    select: {
      id: true, isPrivate: true, feedback: true,
      step: { select: { challengeId: true, title: true } },
      participant: {
        select: {
          id: true, profileId: true,
          profile: { select: { email: true, fullName: true } },
        },
      },
    },
  })
  if (!submission || submission.step.challengeId !== challenge.id) {
    return { success: false, error: 'That submission is not in this challenge.' }
  }

  // Reviewing private work needs the stronger capability, not just the
  // reviewing one.
  if (submission.isPrivate) {
    const maySee = await hasPermission(user.id, workspaceId, 'submission.view_private')
    if (!maySee) {
      return { success: false, error: 'You cannot open private submissions.' }
    }
  }

  await db.submission.update({
    where: { id: submissionId },
    data:  { feedback: text, reviewedById: user.id, reviewedAt: new Date() },
  })

  // Telling them once per review, not once per submission: editing feedback
  // should reach the participant, so the key carries the moment it was left.
  await dispatch({
    trigger:        'submission_feedback',
    workspaceId,
    challengeId:    challenge.id,
    participantId:  submission.participant.id,
    profileId:      submission.participant.profileId,
    to:             submission.participant.profile.email,
    idempotencyKey: `${submission.id}:submission_feedback:${Date.now()}`,
    values: {
      participantName: submission.participant.profile.fullName?.split(' ')[0]
        ?? submission.participant.profile.email,
      challengeTitle:  challenge.title,
      workspaceName,
      stepTitle:       submission.step.title,
      actionUrl:       `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/c/${challenge.slug}/hub`,
    },
  })

  revalidatePath(`/ws/${workspaceSlug}/challenges/${challengeSlug}/submissions`)
  return { success: true }
}
