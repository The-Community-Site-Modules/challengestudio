import { redirect, notFound } from 'next/navigation'
import { getCurrentUser }      from '@/lib/auth/session'
import { db }                  from '@/lib/db'
import { unlockMap, type ChallengeMode } from '@/lib/enrollment/unlock'
import { DayClient }           from './_components/day-client'

interface Props {
  params: Promise<{ challengeSlug: string; dayNumber: string }>
}

export default async function DayPage({ params }: Props) {
  const { challengeSlug, dayNumber: dayStr } = await params
  const dayNumber = parseInt(dayStr)
  if (isNaN(dayNumber) || dayNumber < 1) notFound()

  const user = await getCurrentUser()
  if (!user) {
    redirect(`/c/${challengeSlug}/access?next=/c/${challengeSlug}/day/${dayNumber}`)
  }

  // Load challenge + step by order (dayNumber - 1 since order is 0-based)
  const challenge = await db.challenge.findFirst({
    where: { slug: challengeSlug },
    select: {
      id: true, title: true, startsAt: true, mode: true, timezone: true,
      steps: {
        orderBy: { order: 'asc' },
        select: {
          id: true, title: true, order: true, stepType: true,
          isRequired: true, estimatedMinutes: true, pointsXp: true,
          availableAt: true,
          contentBlocks: {
            orderBy: { order: 'asc' },
            select: { id: true, type: true, data: true },
          },
        },
      },
    },
  })

  if (!challenge) notFound()

  // Verify enrollment
  const participant = await db.participant.findUnique({
    where: { challengeId_profileId: { challengeId: challenge.id, profileId: user.id } },
    select: {
      id: true, status: true, registeredAt: true,
      submissions: { select: { stepId: true } },
    },
  })

  if (!participant) {
    redirect(`/c/${challengeSlug}`)
  }

  // Registered but not yet approved: the welcome page explains the wait.
  if (participant.status === 'PENDING') {
    redirect(`/c/${challengeSlug}/welcome`)
  }

  // Get step by dayNumber — order is 0-based, dayNumber is 1-based
  // Use find() to be safe even if order values have gaps
  const step = challenge.steps.find(s => s.order === dayNumber - 1)
  if (!step) notFound()

  // Same engine the hub uses. This page used to carry its own fixed-calendar
  // copy that ignored both the mode and the timezone, so the two could
  // disagree — the hub showing a step locked while its URL opened it.
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

  if (!unlocks.get(step.id)?.unlocked) {
    redirect(`/c/${challengeSlug}/hub`)
  }

  const submittedStepIds = new Set(participant.submissions.map(s => s.stepId))
  const isCompleted = submittedStepIds.has(step.id)

  return (
    <DayClient
      challengeSlug={challengeSlug}
      step={{
        id:              step.id,
        title:           step.title,
        order:           step.order,
        estimatedMinutes: step.estimatedMinutes,
        pointsXp:        step.pointsXp,
        isRequired:      step.isRequired,
        totalSteps:      challenge.steps.length,
        blocks: step.contentBlocks.map(b => ({
          id:   b.id,
          type: (b.type as string).toLowerCase(),
          data: b.data as Record<string, string>,
        })),
      }}
      isCompleted={isCompleted}
      participantId={participant.id}
    />
  )
}
