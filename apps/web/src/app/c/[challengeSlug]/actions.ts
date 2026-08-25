'use server'

import { redirect }    from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { db }           from '@/lib/db'

// ─── Register (public — no auth required) ────────────────────────────────────

export async function registerAction(challengeSlug: string, formData: FormData) {
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
      id: true, slug: true, title: true, status: true,
      maxParticipants: true, requiresApproval: true,
      registrationOpensAt: true, registrationClosesAt: true,
      _count: { select: { participants: true } },
    },
  })

  if (!challenge) redirect(`/c/${challengeSlug}?error=` + encodeURIComponent('Challenge not found.'))
  if (!['PUBLISHED', 'ACTIVE'].includes(challenge.status as string)) {
    redirect(`/c/${challengeSlug}?error=` + encodeURIComponent('Registration is not open.'))
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

    // Create participant record (idempotent)
    await db.participant.upsert({
      where:  { challengeId_profileId: { challengeId: challenge.id, profileId: existingUser.id } },
      update: {},
      create: { challengeId: challenge.id, profileId: existingUser.id, status: 'REGISTERED' as never },
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

  // Create participant row
  await db.participant.upsert({
    where:  { challengeId_profileId: { challengeId, profileId: userId } },
    update: {},
    create: { challengeId, profileId: userId, status: 'REGISTERED' as never },
  })
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
    select: { id: true },
  })
  if (!challenge) return

  const participant = await db.participant.findUnique({
    where: { challengeId_profileId: { challengeId: challenge.id, profileId: user.id } },
    select: { id: true },
  })
  if (!participant) return

  // Upsert submission (removes participantId helper field before storing)
  const { participantId: _removed, ...cleanData } = submissionData as Record<string, unknown> & { participantId?: string }
  await db.submission.upsert({
    where:  { participantId_stepId: { participantId: participant.id, stepId } },
    update: { data: cleanData as never },
    create: { participantId: participant.id, stepId, data: cleanData as never },
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

  if (completedRequired >= allRequired && allRequired > 0) {
    await db.participant.update({
      where: { id: participant.id },
      data:  { status: 'COMPLETED' as never, completedAt: new Date() },
    })
  }
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

  const steps = challenge.steps.map((step, index) => {
    const isCompleted = submittedStepIds.has(step.id)

    let unlocked = true
    if (challenge.mode === 'DRIP' || step.availableAt) {
      unlocked = step.availableAt ? step.availableAt <= now : true
    } else if (challenge.startsAt) {
      const unlockDate = new Date(challenge.startsAt)
      unlockDate.setDate(unlockDate.getDate() + index)
      unlocked = unlockDate <= now
    }

    return {
      ...step,
      isCompleted,
      unlocked,
      status: isCompleted ? 'completed' as const :
              unlocked    ? 'active'    as const :
              'locked'    as const,
    }
  })

  // Streak: count unique days with at least one submission, working backwards
  const uniqueSubmissionDays = new Set(
    participant.submissions.map(s => {
      const d = new Date(s.submittedAt)
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    })
  )
  let streak = 0
  const checkDate = new Date()
  while (true) {
    const key = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`
    if (uniqueSubmissionDays.has(key)) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else break
  }

  const completedCount = steps.filter(s => s.isCompleted).length
  const totalRequired  = steps.filter(s => s.isRequired).length
  const xp             = steps.filter(s => s.isCompleted).reduce((sum, s) => sum + (s.pointsXp ?? 100), 0)
  const progressPct    = totalRequired > 0 ? Math.round((completedCount / totalRequired) * 100) : 0

  return { challenge, participant, steps, streak, xp, progressPct, completedCount, totalRequired }
}
