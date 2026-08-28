/**
 * Challenge analytics (PRD §17.1, milestone 10).
 *
 * The ten metrics §17.1 names, computed from the tables that already record
 * them rather than from a counter kept alongside. Nothing here is estimated:
 * PRD §27 asks that "creator totals match the underlying registrations,
 * enrollments, and completion records", and the only way to keep that true is
 * to count the records.
 *
 * The shaping is separated from the querying so the arithmetic — rates,
 * averages, the at-risk rule — can be tested without a database.
 */

import { db } from '@/lib/db'
import { calculateUnlocks, type ChallengeMode } from '@/lib/enrollment/unlock'

export interface DayReach {
  stepId: string
  title: string
  order: number
  /** Participants for whom this step has opened. */
  reached: number
  /** Of those, how many submitted. */
  completed: number
}

export interface AtRiskParticipant {
  participantId: string
  name: string
  email: string
  daysSinceActivity: number | null
  completedSteps: number
  totalSteps: number
}

export interface ChallengeMetrics {
  registrations: number
  /** Registered people who did at least one thing (§17.1 "activation"). */
  activated: number
  activationRate: number
  completed: number
  completionRate: number
  averageDaysCompleted: number
  /** Submissions made, over submissions possible for reached steps. */
  submissionRate: number
  /** Participants who posted or commented at least once. */
  communityParticipants: number
  communityRate: number
  offerClicks: number
  liveSessions: number
  dayByDay: DayReach[]
  atRisk: AtRiskParticipant[]
  /** Registrations per day, for the trend chart. */
  registrationTrend: { date: string; value: number }[]
}

/** No progress for this many days puts someone on the at-risk list. */
const AT_RISK_DAYS = 3
const TREND_DAYS = 30

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0)

const dayKey = (d: Date) => d.toISOString().slice(0, 10)

export async function challengeMetrics(challengeId: string, now = new Date()): Promise<ChallengeMetrics> {
  const challenge = await db.challenge.findUnique({
    where:  { id: challengeId },
    select: {
      id: true, mode: true, timezone: true, startsAt: true,
      steps: {
        where:   { isPublished: true },
        orderBy: { order: 'asc' },
        select:  { id: true, title: true, order: true, availableAt: true, isRequired: true },
      },
      offer: { select: { _count: { select: { clicks: true } } } },
      _count: { select: { liveSessions: true } },
    },
  })
  if (!challenge) throw new Error(`challengeMetrics: challenge ${challengeId} not found`)

  const participants = await db.participant.findMany({
    where:  { challengeId },
    select: {
      id: true, status: true, registeredAt: true,
      profile: { select: { fullName: true, email: true } },
      submissions: { select: { stepId: true, submittedAt: true } },
      _count: { select: { posts: true, comments: true } },
    },
  })

  const steps = challenge.steps
  const requiredCount = steps.filter(s => s.isRequired).length || steps.length

  // Day-by-day reach: how many people the step has opened for, and how many
  // of those did it. Reach is recomputed from the unlock engine rather than
  // assumed from dates, so it agrees with what participants actually saw.
  const reached = new Map(steps.map(s => [s.id, 0]))
  const completedPerStep = new Map(steps.map(s => [s.id, 0]))

  let activated = 0
  let totalCompletedSteps = 0
  let possibleSubmissions = 0
  const atRisk: AtRiskParticipant[] = []
  const trend = new Map<string, number>()

  const since = new Date(now.getTime() - (TREND_DAYS - 1) * 86_400_000)
  since.setUTCHours(0, 0, 0, 0)
  for (let i = 0; i < TREND_DAYS; i++) {
    trend.set(dayKey(new Date(since.getTime() + i * 86_400_000)), 0)
  }

  for (const p of participants) {
    const key = dayKey(p.registeredAt)
    if (trend.has(key)) trend.set(key, (trend.get(key) ?? 0) + 1)

    const submittedStepIds = new Set(p.submissions.map(s => s.stepId))
    if (submittedStepIds.size > 0) activated++
    totalCompletedSteps += submittedStepIds.size

    const unlocks = calculateUnlocks({
      mode:              challenge.mode as ChallengeMode,
      timezone:          challenge.timezone ?? 'UTC',
      challengeStartsAt: challenge.startsAt,
      enrolledAt:        p.registeredAt,
      now,
      steps: steps.map(s => ({ id: s.id, order: s.order, availableAt: s.availableAt })),
    })

    for (const u of unlocks) {
      if (!u.unlocked) continue
      reached.set(u.id, (reached.get(u.id) ?? 0) + 1)
      possibleSubmissions++
      if (submittedStepIds.has(u.id)) {
        completedPerStep.set(u.id, (completedPerStep.get(u.id) ?? 0) + 1)
      }
    }

    // At risk: enrolled, not finished, and nothing submitted lately. Someone
    // who has never submitted counts from when they registered.
    if (p.status !== 'COMPLETED' && p.status !== 'DROPPED') {
      const last = p.submissions.reduce<Date | null>(
        (newest, s) => (!newest || s.submittedAt > newest ? s.submittedAt : newest), null
      )
      const reference = last ?? p.registeredAt
      const days = Math.floor((now.getTime() - reference.getTime()) / 86_400_000)
      if (days >= AT_RISK_DAYS) {
        atRisk.push({
          participantId: p.id,
          name: p.profile.fullName?.trim() || p.profile.email,
          email: p.profile.email,
          daysSinceActivity: last ? days : null,
          completedSteps: submittedStepIds.size,
          totalSteps: requiredCount,
        })
      }
    }
  }

  const totalSubmissions = participants.reduce((n, p) => n + p.submissions.length, 0)
  const completed = participants.filter(p => p.status === 'COMPLETED').length
  const communityParticipants = participants.filter(p => p._count.posts + p._count.comments > 0).length

  atRisk.sort((a, b) => (b.daysSinceActivity ?? 999) - (a.daysSinceActivity ?? 999))

  return {
    registrations: participants.length,
    activated,
    activationRate: pct(activated, participants.length),
    completed,
    completionRate: pct(completed, participants.length),
    averageDaysCompleted: participants.length > 0
      ? Math.round((totalCompletedSteps / participants.length) * 10) / 10
      : 0,
    submissionRate: pct(totalSubmissions, possibleSubmissions),
    communityParticipants,
    communityRate: pct(communityParticipants, participants.length),
    offerClicks: challenge.offer?._count.clicks ?? 0,
    liveSessions: challenge._count.liveSessions,
    dayByDay: steps.map(s => ({
      stepId: s.id,
      title: s.title,
      order: s.order,
      reached: reached.get(s.id) ?? 0,
      completed: completedPerStep.get(s.id) ?? 0,
    })),
    atRisk: atRisk.slice(0, 20),
    registrationTrend: [...trend].map(([date, value]) => ({ date, value })),
  }
}
