'use server'

import { redirect }    from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { db }           from '@/lib/db'
import { unlockMap, type ChallengeMode } from '@/lib/enrollment/unlock'
import { awardPoints, earnedBadgeKeys, totalPoints, badgeByKey } from '@/lib/gamification'
import { dispatch } from '@/lib/communications'
import { checkRateLimit, rateLimitMessage } from '@/lib/rate-limit'
import { callerIp } from '@/lib/rate-limit/caller'

/**
 * Where a new participant starts.
 *
 * Challenge.requiresApproval was stored but never read: every registration
 * landed on REGISTERED, so a creator who asked to vet people got none of it.
 * PENDING is the waiting room; a creator moves them on from there.
 */
function initialParticipantStatus(requiresApproval: boolean) {
  return requiresApproval ? 'PENDING' : 'REGISTERED'
}

// ─── Register (public — no auth required) ────────────────────────────────────

export async function registerAction(challengeSlug: string, formData: FormData) {
  // PRD §22.2: the registration form is open to the internet, so it is limited
  // before anything is read from it or written anywhere.
  const limit = await checkRateLimit('public_registration', await callerIp())
  if (!limit.allowed) {
    redirect(`/c/${challengeSlug}?error=` + encodeURIComponent(rateLimitMessage(limit)))
  }

  const firstName = (formData.get('firstName') as string).trim()
  const lastName  = (formData.get('lastName')  as string).trim()
  const email     = (formData.get('email')     as string).trim().toLowerCase()

  if (!email || !firstName) {
    redirect(`/c/${challengeSlug}?error=` + encodeURIComponent('Please fill in all required fields.'))
  }

  const fullName = `${firstName} ${lastName}`.trim()

  // Look up the challenge
  const challenge = await db.challenge.findFirst({
    where: { slug: challengeSlug },
    select: {
      id: true, slug: true, title: true, status: true, workspaceId: true, startsAt: true,
      maxParticipants: true, requiresApproval: true, isPublic: true,
      workspace: { select: { name: true } },
      registrationOpensAt: true, registrationClosesAt: true,
      _count: { select: { participants: true } },
    },
  })

  if (!challenge) redirect(`/c/${challengeSlug}?error=` + encodeURIComponent('Challenge not found.'))
  if (!['PUBLISHED', 'ACTIVE'].includes(challenge.status as string)) {
    redirect(`/c/${challengeSlug}?error=` + encodeURIComponent('Registration is not open.'))
  }

  // A private challenge is invite-only. The setting was collected by the wizard
  // and stored but never read, so anyone with the URL could register.
  if (!challenge.isPublic) {
    redirect(`/c/${challengeSlug}?error=` + encodeURIComponent('This challenge is private.'))
  }

  const now = new Date()
  if (challenge.registrationOpensAt && challenge.registrationOpensAt > now) {
    redirect(`/c/${challengeSlug}?error=` + encodeURIComponent('Registration is not open yet.'))
  }
  if (challenge.registrationClosesAt && challenge.registrationClosesAt < now) {
    redirect(`/c/${challengeSlug}?error=` + encodeURIComponent('Registration has closed.'))
  }
  if (challenge.maxParticipants && challenge._count.participants >= challenge.maxParticipants) {
    redirect(`/c/${challengeSlug}?error=` + encodeURIComponent('This challenge is full.'))
  }

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
          ? { startDate: challenge.startsAt.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) }
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

// ─── Post-OTP enrollment (called from auth callback) ─────────────────────────
// Creates Profile + Participant after user authenticates via magic link

export async function enrollAfterAuthAction(
  userId:      string,
  email:       string,
  fullName:    string,
  challengeId: string
) {
  // Upsert profile (auth trigger should have created it, but we guard against race conditions)
  await db.profile.upsert({
    where:  { id: userId },
    update: { fullName: fullName || undefined },
    create: { id: userId, email, fullName: fullName || null },
  })

  // The magic-link path enrolls here rather than at form submit, so it has to
  // re-read the approval setting to reach the same decision.
  const challenge = await db.challenge.findUnique({
    where:  { id: challengeId },
    select: { requiresApproval: true },
  })
  if (!challenge) throw new Error(`enrollAfterAuth: challenge ${challengeId} not found`)

  await db.participant.upsert({
    where:  { challengeId_profileId: { challengeId, profileId: userId } },
    update: {},
    create: {
      challengeId,
      profileId: userId,
      status:    initialParticipantStatus(challenge.requiresApproval) as never,
    },
  })
}


/**
 * Consecutive days with at least one submission, counting back from today.
 *
 * Derived from the timestamps rather than stored, so it cannot drift out of
 * step with the submissions it describes (Build Plan data rule 2).
 */
function streakFrom(submittedAt: Date[]): number {
  const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  const days = new Set(submittedAt.map(d => key(new Date(d))))

  let streak = 0
  const cursor = new Date()
  while (days.has(key(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

// ─── Complete Step ────────────────────────────────────────────────────────────

export async function completeStepAction(
  challengeSlug:  string,
  stepId:         string,
  submissionData: Record<string, unknown>
) {
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
      steps: { select: { id: true, order: true, availableAt: true, pointsXp: true } },
    },
  })
  if (!challenge) return

  const participant = await db.participant.findUnique({
    where: { challengeId_profileId: { challengeId: challenge.id, profileId: user.id } },
    select: { id: true, status: true, registeredAt: true },
  })
  if (!participant) return
  // Not approved yet means not taking part yet — otherwise approval would only
  // hide the pages, not stop the work being submitted.
  if (participant.status === 'PENDING') return

  // stepId arrives from the client. Without this, a submission could be filed
  // against a step in someone else's challenge entirely.
  const step = challenge.steps.find(s => s.id === stepId)
  if (!step) return

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
  if (!unlocks.get(step.id)?.unlocked) return

  // Upsert submission (removes participantId helper field before storing)
  const { participantId: _removed, ...cleanData } = submissionData as Record<string, unknown> & { participantId?: string }

  // The reflection block's privacy toggle rides in with the payload. It now
  // lives in a column as well, because a flag buried in JSON is one no query
  // can filter on — and the review page has to.
  const isPrivate = cleanData.isPrivate === true

  await db.submission.upsert({
    where:  { participantId_stepId: { participantId: participant.id, stepId } },
    update: { data: cleanData as never, isPrivate },
    create: { participantId: participant.id, stepId, data: cleanData as never, isPrivate },
  })

  // Auto-complete participant when all required steps are done
  const allRequired = await db.challengeStep.count({
    where: { challengeId: challenge.id, isRequired: true },
  })
  const completedRequired = await db.submission.count({
    where: {
      participantId: participant.id,
      step: { challengeId: challenge.id, isRequired: true },
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

  if (finished) {
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
    streak:         streakFrom(submissions.map(s => s.submittedAt)),
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

// ─── Get participant + step unlock status ─────────────────────────────────────

export async function getParticipantProgress(challengeSlug: string, userId: string) {
  const challenge = await db.challenge.findFirst({
    where: { slug: challengeSlug },
    select: {
      id: true, title: true, startsAt: true, endsAt: true, timezone: true, mode: true,
      workspace: { select: { name: true, logoUrl: true } },
      steps: {
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

  const steps = challenge.steps.map((step) => {
    const isCompleted = submittedStepIds.has(step.id)
    const unlock      = unlocks.get(step.id)
    const unlocked    = unlock?.unlocked ?? true

    return {
      ...step,
      isCompleted,
      unlocked,
      unlocksAt: unlock?.unlocksAt ?? null,
      status: isCompleted ? 'completed' as const :
              unlocked    ? 'active'    as const :
              'locked'    as const,
    }
  })

  const streak = streakFrom(participant.submissions.map(s => s.submittedAt))

  const completedCount = steps.filter(s => s.isCompleted).length
  const totalRequired  = steps.filter(s => s.isRequired).length
  const xp             = await totalPoints(participant.id)
  const progressPct    = totalRequired > 0 ? Math.round((completedCount / totalRequired) * 100) : 0

  return { challenge, participant, steps, streak, xp, progressPct, completedCount, totalRequired }
}
