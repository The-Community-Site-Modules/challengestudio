import { redirect, notFound } from 'next/navigation'
import { getCurrentUser }      from '@/lib/auth/session'
import { db }                  from '@/lib/db'
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
      id: true, title: true, startsAt: true, mode: true,
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
      id: true, status: true,
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

  // Unlock check (simple fixed-calendar)
  const now = new Date()
  let unlocked = true
  if (challenge.startsAt) {
    const unlockDate = new Date(challenge.startsAt)
    unlockDate.setDate(unlockDate.getDate() + (dayNumber - 1))
    unlocked = unlockDate <= now
  }
  if (step.availableAt) unlocked = step.availableAt <= now

  if (!unlocked) {
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
