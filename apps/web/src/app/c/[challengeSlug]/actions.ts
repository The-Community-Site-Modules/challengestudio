'use server'

import { redirect }    from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { db }           from '@/lib/db'
import { unlockMap, type ChallengeMode } from '@/lib/enrollment/unlock'
import { awardPoints, earnedBadgeKeys, badgeByKey } from '@/lib/gamification'
import { dispatch } from '@/lib/communications'
import { checkRateLimit, rateLimitMessage } from '@/lib/rate-limit'
import { callerIp } from '@/lib/rate-limit/caller'
import { initialParticipantStatus, isParticipating, registrationBlocker } from '@/lib/enrollment/register'
import { submissionIsPrivate } from '@/lib/submissions/payload'
import { streakDays } from '@/lib/gamification/streak'
import { formatInZone } from '@/lib/time/zoned'

// ─── Register (public — no auth required) ────────────────────────────────────

export async function registerAction(challengeSlug: string, formData: FormData) {
  // PRD §22.2: the registration form is open to the internet, so it is limited
  // before anything is read from it or written anywhere.
  const limit = await checkRateLimit('public_registration', await callerIp())
  if (!limit.allowed) {
    redirect(`/c/${challengeSlug}?error=` + encodeURIComponent(rateLimitMessage(limit)))
  }

  const firstName = String(formData.get('firstName') ?? '').trim()
  const lastName  = String(formData.get('lastName') ?? '').trim()
  const email     = String(formData.get('email') ?? '').trim().toLowerCase()

  if (!email || !firstName) {
    redirect(`/c/${challengeSlug}?error=` + encodeURIComponent('Please fill in all required fields.'))
  }

  const fullName = `${firstName} ${lastName}`.trim()

  // Look up the challenge
  const challenge = await db.challenge.findFirst({
    where: { slug: challengeSlug },
    select: {
      id: true, slug: true, title: true, status: true, workspaceId: true, startsAt: true, timezone: true,
      maxParticipants: true, requiresApproval: true, isPublic: true,
      workspace: { select: { name: true } },
      registrationOpensAt: true, registrationClosesAt: true,
      _count: { select: { participants: true } },
    },
  })

  if (!challenge) redirect(`/c/${challengeSlug}?error=` + encodeURIComponent('Challenge not found.'))
  // The same gate the magic-link callback applies — see lib/enrollment/register.
  const blocked = registrationBlocker({
    status:               challenge.status as string,
    isPublic:             challenge.isPublic,
    registrationOpensAt:  challenge.registrationOpensAt,
    registrationClosesAt: challenge.registrationClosesAt,
    maxParticipants:      challenge.maxParticipants,
    participantCount:     challenge._count.participants,
  })
  if (blocked) redirect(`/c/${challengeSlug}?error=` + encodeURIComponent(blocked))

  const supabase = await createClient()
  const { data: { user: existingUser } } = await supabase.auth.getUser()

  if (existingUser) {
    // ── Already signed in ──────────────────────────────────────────────────
    // Ensure profile exists
    await db.profile.upsert({
      where:  { id: existingUser.id },
      update: { fullName },
      create: { id: existingUser.id, email: existingUser.email ?? email, fullName },
    })

    // Create participant record (idempotent). A challenge that requires
    // approval admits nobody automatically — see initialParticipantStatus.
    await db.participant.upsert({
      where:  { challengeId_profileId: { challengeId: challenge.id, profileId: existingUser.id } },
      update: {},
      create: {
        challengeId: challenge.id,
        profileId:   existingUser.id,
        status:      initialParticipantStatus(challenge.requiresApproval) as never,
      },
    })

    await dispatch({
      trigger:       'registration_confirm',
      workspaceId:   challenge.workspaceId,
      challengeId:   challenge.id,
      profileId:     existingUser.id,
      to:            existingUser.email ?? email,
      idempotencyKey: `${existingUser.id}:${challenge.id}:registration_confirm`,
      values: {
        participantName: firstName,
        challengeTitle:  challenge.title,
        workspaceName:   challenge.workspace.name,
        ...(challenge.startsAt
          ? { startDate: formatInZone(challenge.startsAt, challenge.timezone, { day: 'numeric', month: 'long', year: 'numeric' }) }
          : {}),
      },
    })

    redirect(`/c/${challengeSlug}/confirm?email=${encodeURIComponent(email)}&name=${encodeURIComponent(firstName)}`)
  }

  // ── Not signed in — send OTP magic link ────────────────────────────────────
  //
  // Strategy: embed challengeId + fullName in the OTP redirect URL so the
  // auth callback can create the participant row AFTER the user is authenticated.
  //
  // Flow:  register form → OTP email → magic link click
  //        → /api/auth/callback?next=/c/${slug}/welcome&challenge=${id}
  //        → callback creates Profile + Participant → redirect to /welcome

  const callbackNext = `/c/${challengeSlug}/welcome`
  const callbackUrl  = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`
    + `?next=${encodeURIComponent(callbackNext)}`
    + `&challenge=${encodeURIComponent(challenge.id)}`
    + `&name=${encodeURIComponent(fullName)}`

  const { error: otpError } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      data:             { full_name: fullName },
      emailRedirectTo:  callbackUrl,
    },
  })

  if (otpError) {
    redirect(`/c/${challengeSlug}?error=` + encodeURIComponent(otpError.message))
  }

  // Redirect to confirm page — the actual participant row is created in the
  // auth callback AFTER the user clicks their magic link
  redirect(
    `/c/${challengeSlug}/confirm?email=${encodeURIComponent(email)}&name=${encodeURIComponent(firstName)}`
  )
}

// Post-OTP enrolment lives in lib/enrollment/register (enrollAfterAuth). It is
// not a server action: exported from here it would be callable by anyone with
// an arbitrary user id.


// ─── Complete Step ────────────────────────────────────────────────────────────

/**
 * What the day page is told. Every refusal used to be a bare `return`, which
 * the page could not tell apart from success — so it showed "Step complete!
 * You earned 100 XP" for work that was never saved.
 */
type CompleteStepResult = { success: true } | { success: false; error: string }

export async function completeStepAction(
  challengeSlug:  string,
  stepId:         string,
  submissionData: Record<string, unknown>
): Promise<CompleteStepResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/c/${challengeSlug}/access?next=/c/${challengeSlug}`)
  }

  const challenge = await db.challenge.findFirst({
    where: { slug: challengeSlug },
    select: {
      id: true, mode: true, timezone: true, startsAt: true,
      workspaceId: true,
      // Unpublished steps are the creator's drafts: not openable, not
      // submittable, and not counted towards finishing.
      steps: {
        where:  { isPublished: true },
        select: { id: true, order: true, availableAt: true, pointsXp: true },
      },
    },
  })
  if (!challenge) return { success: false, error: 'That challenge no longer exists.' }

  const participant = await db.participant.findUnique({
    where: { challengeId_profileId: { challengeId: challenge.id, profileId: user.id } },
    select: { id: true, status: true, registeredAt: true },
  })
  // Not approved yet (PENDING) or turned away (DROPPED) means not taking part —
  // otherwise those decisions would only hide the pages, not stop the work.
  if (!participant || !isParticipating(participant.status)) {
    return { success: false, error: 'You are not taking part in this challenge.' }
  }

  // stepId arrives from the client. Without this, a submission could be filed
  // against a step in someone else's challenge entirely.
  const step = challenge.steps.find(s => s.id === stepId)
  if (!step) return { success: false, error: 'That step is not available.' }

  // The day page redirects away from a locked step, but that only guards the
  // page. Work can be posted directly, so the gate has to be here too.
  const unlocks = unlockMap({
    mode:              challenge.mode as ChallengeMode,
    timezone:          challenge.timezone ?? 'UTC',
    challengeStartsAt: challenge.startsAt,
    enrolledAt:        participant.registeredAt,
    now:               new Date(),
    steps: challenge.steps.map(s => ({
      id: s.id, order: s.order, availableAt: s.availableAt,
    })),
  })
  if (!unlocks.get(step.id)?.unlocked) return { success: false, error: 'That step has not opened yet.' }

  // Upsert submission (removes participantId helper field before storing)
  const { participantId: _removed, ...cleanData } = submissionData as Record<string, unknown> & { participantId?: string }

  // The reflection block's privacy toggle rides in with the payload, nested
  // under the block's id. It lives in a column as well, because a flag buried
  // in JSON is one no query can filter on — and the review page has to.
  const isPrivate = submissionIsPrivate(cleanData)

  await db.submission.upsert({
    where:  { participantId_stepId: { participantId: participant.id, stepId } },
    update: { data: cleanData as never, isPrivate },
    create: { participantId: participant.id, stepId, data: cleanData as never, isPrivate },
  })

  // Auto-complete participant when all required steps are done
  const allRequired = await db.challengeStep.count({
    where: { challengeId: challenge.id, isRequired: true, isPublished: true },
  })
  const completedRequired = await db.submission.count({
    where: {
      participantId: participant.id,
      step: { challengeId: challenge.id, isRequired: true, isPublished: true },
    },
  })

  // Points for the step. Idempotent on (participant, action, step), so
  // re-submitting an answer does not earn twice.
  await awardPoints({
    workspaceId:   challenge.workspaceId,
    challengeId:   challenge.id,
    participantId: participant.id,
    action:        'day_completed',
    sourceId:      step.id,
    ...(step.pointsXp != null ? { points: step.pointsXp } : {}),
  })

  const finished = completedRequired >= allRequired && allRequired > 0

  // Only the first time: re-submitting a step afterwards used to move
  // completedAt to that moment, rewriting when they actually finished.
  if (finished && participant.status !== 'COMPLETED') {
    await db.participant.update({
      where: { id: participant.id },
      data:  { status: 'COMPLETED' as never, completedAt: new Date() },
    })
    await awardPoints({
      workspaceId:   challenge.workspaceId,
      challengeId:   challenge.id,
      participantId: participant.id,
      action:        'challenge_completed',
      sourceId:      challenge.id,
    })
  }

  const newBadges = await evaluateBadges({
    challengeId:   challenge.id,
    participantId: participant.id,
    completedSteps: completedRequired,
    totalSteps:     allRequired,
    timeZone:       challenge.timezone ?? 'UTC',
  })

  // Both of these are non-essential, so an unsubscribed participant is skipped
  // inside dispatch rather than here.
  if (finished || newBadges.length > 0) {
    const profile = await db.profile.findUnique({
      where:  { id: user.id },
      select: { email: true, fullName: true },
    })
    const challengeRow = await db.challenge.findUnique({
      where:  { id: challenge.id },
      select: { title: true, slug: true, workspace: { select: { name: true } } },
    })

    if (profile && challengeRow) {
      const common = {
        participantName: profile.fullName?.split(' ')[0] ?? profile.email,
        challengeTitle:  challengeRow.title,
        workspaceName:   challengeRow.workspace.name,
      }

      for (const key of newBadges) {
        const badge = badgeByKey(key)
        if (!badge) continue
        await dispatch({
          trigger:        'milestone_earned',
          workspaceId:    challenge.workspaceId,
          challengeId:    challenge.id,
          participantId:  participant.id,
          profileId:      user.id,
          to:             profile.email,
          idempotencyKey: `${participant.id}:milestone_earned:${key}`,
          values: { ...common, badgeName: badge.name },
        })
      }

      if (finished) {
        await dispatch({
          trigger:        'completion',
          workspaceId:    challenge.workspaceId,
          challengeId:    challenge.id,
          participantId:  participant.id,
          profileId:      user.id,
          to:             profile.email,
          idempotencyKey: `${participant.id}:completion`,
          values: {
            ...common,
            actionUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/c/${challengeRow.slug}/complete`,
          },
        })
      }
    }
  }

  return { success: true }
}

/**
 * Award any badge this participant now qualifies for.
 *
 * The unique constraint on (participant, badge) makes re-awarding a no-op, so
 * this can run after every submission without keeping track of what was given
 * before.
 */
async function evaluateBadges(input: {
  challengeId: string
  participantId: string
  completedSteps: number
  totalSteps: number
  timeZone: string
}): Promise<string[]> {
  const [posts, comments, submissions] = await Promise.all([
    db.feedPost.count({ where: { participantId: input.participantId } }),
    db.feedComment.count({ where: { participantId: input.participantId } }),
    db.submission.findMany({
      where:  { participantId: input.participantId },
      select: { submittedAt: true },
    }),
  ])

  const keys = earnedBadgeKeys({
    completedSteps: input.completedSteps,
    totalSteps:     input.totalSteps,
    streak:         streakDays(submissions.map(s => s.submittedAt), input.timeZone),
    posts,
    comments,
  })
  if (keys.length === 0) return []

  // Which of these are new? createMany with skipDuplicates does not say, and
  // mailing about a badge earned last week would be worse than not mailing.
  const already = await db.badgeAward.findMany({
    where:  { participantId: input.participantId, badgeKey: { in: keys } },
    select: { badgeKey: true },
  })
  const had = new Set(already.map(a => a.badgeKey))
  const fresh = keys.filter(k => !had.has(k))
  if (fresh.length === 0) return []

  await db.badgeAward.createMany({
    data: fresh.map(badgeKey => ({
      challengeId:   input.challengeId,
      participantId: input.participantId,
      badgeKey,
    })),
    skipDuplicates: true,
  })
  return fresh
}
