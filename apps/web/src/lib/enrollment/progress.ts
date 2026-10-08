/**
 * A participant's progress through a challenge, for the participant pages.
 *
 * Moved out of app/c/[challengeSlug]/actions.ts: everything exported from a
 * 'use server' module is an endpoint the browser can call with arguments of
 * its own choosing, and this one took a userId — so anyone could read any
 * account's progress, status and submission times. Server pages call it with
 * the signed-in user's id; nothing else can.
 */

import { db } from '@/lib/db'
import { unlockMap, type ChallengeMode } from '@/lib/enrollment/unlock'
import { totalPoints } from '@/lib/gamification'
import { streakDays } from '@/lib/gamification/streak'

export async function getParticipantProgress(challengeSlug: string, userId: string) {
  const challenge = await db.challenge.findFirst({
    where: { slug: challengeSlug },
    select: {
      id: true, title: true, startsAt: true, endsAt: true, timezone: true, mode: true,
      workspace: { select: { name: true, logoUrl: true } },
      // Drafts are the creator's, not the participant's: unpublished steps are
      // neither shown nor counted.
      steps: {
        where:   { isPublished: true },
        orderBy: { order: 'asc' },
        select: {
          id: true, title: true, order: true, stepType: true,
          isRequired: true, availableAt: true, pointsXp: true, estimatedMinutes: true,
        },
      },
    },
  })
  if (!challenge) return null

  const participant = await db.participant.findUnique({
    where: { challengeId_profileId: { challengeId: challenge.id, profileId: userId } },
    select: {
      id: true, status: true, registeredAt: true, completedAt: true,
      submissions: { select: { stepId: true, submittedAt: true } },
    },
  })
  if (!participant) return null

  const submittedStepIds = new Set(participant.submissions.map(s => s.stepId))
  const now = new Date()

  // The schedule maths lives in lib/enrollment/unlock, where it is tested.
  // It used to be inline here and ignored challenge.timezone entirely, so day
  // boundaries followed whichever machine happened to be serving the request.
  const unlocks = unlockMap({
    mode:              challenge.mode as ChallengeMode,
    timezone:          challenge.timezone ?? 'UTC',
    challengeStartsAt: challenge.startsAt,
    enrolledAt:        participant.registeredAt,
    now,
    steps: challenge.steps.map(s => ({
      id: s.id, order: s.order, availableAt: s.availableAt,
    })),
  })

  const steps = challenge.steps.map((step, index) => {
    const isCompleted = submittedStepIds.has(step.id)
    const unlock      = unlocks.get(step.id)
    const unlocked    = unlock?.unlocked ?? true

    return {
      ...step,
      /**
       * 1-based place among the published steps — what "Day N" means on
       * screen. `order` keeps its job as the URL and schedule key, but a draft
       * step in the middle left gaps there, and labels read "Day 5 of 4".
       */
      position: index + 1,
      isCompleted,
      unlocked,
      unlocksAt: unlock?.unlocksAt ?? null,
      status: isCompleted ? 'completed' as const :
              unlocked    ? 'active'    as const :
              'locked'    as const,
    }
  })

  const streak = streakDays(participant.submissions.map(s => s.submittedAt), challenge.timezone ?? 'UTC')

  /** Every finished step, optional ones included — for "X of N steps". */
  const completedCount    = steps.filter(s => s.isCompleted).length
  /** Finished required steps — the only ones that count towards completion. */
  const completedRequired = steps.filter(s => s.isCompleted && s.isRequired).length
  const totalRequired     = steps.filter(s => s.isRequired).length
  const xp                = await totalPoints(participant.id)
  // Measured against required steps only. Counting optional ones as well let
  // the bar pass 100% and opened the completion page before the required
  // work was done.
  const progressPct = totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 0

  return {
    challenge, participant, steps, streak, xp, progressPct,
    completedCount, completedRequired, totalRequired,
  }
}
