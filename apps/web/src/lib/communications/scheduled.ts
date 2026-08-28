/**
 * The scheduled half of the message catalogue (milestone 8/9).
 *
 * Five of the ten messages fire on the clock rather than on something a
 * participant did: challenge starting, day available, session reminder,
 * inactivity nudge, offer closing. Nothing in a request/response app notices
 * that a date has passed, so something has to come and ask.
 *
 * This is that asking, expressed as one pure-ish sweep so it can be driven by
 * whatever ends up calling it — Vercel Cron today, a queue later if OD-04
 * lands on one. Every decision it makes goes through the same `dispatch`, so
 * "sent once" and unsubscribe rules hold no matter how often it runs. That is
 * the property §6 asks for by name: "idempotent unlock evaluation (re-running
 * the calculation must never re-fire notifications already sent)".
 */

import { db } from '@/lib/db'
import { dispatch, type DispatchStatus } from './send'
import { calculateUnlocks, type ChallengeMode } from '@/lib/enrollment/unlock'

export interface SweepResult {
  trigger: string
  considered: number
  sent: number
  duplicates: number
  skipped: number
  failed: number
}

/** Group one dispatch outcome into the counters above. */
function tally(result: SweepResult, status: DispatchStatus) {
  if (status === 'sent') result.sent++
  else if (status === 'duplicate') result.duplicates++
  else if (status === 'failed') result.failed++
  else result.skipped++
}

/**
 * Each dispatch is several round trips to the database, and a sweep may have
 * hundreds of recipients. Done one at a time that runs for minutes — measured
 * against a dev database with a few hundred demo participants, well past the
 * 60s a cron invocation gets.
 *
 * Concurrency is bounded rather than unlimited so a big challenge cannot open
 * hundreds of connections at once. Order does not matter: every send is keyed
 * and idempotent, so the only thing at stake is wall time.
 */
const CONCURRENCY = 10

async function inBatches<T>(items: T[], run: (item: T) => Promise<void>): Promise<void> {
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    await Promise.all(items.slice(i, i + CONCURRENCY).map(run))
  }
}

/**
 * How many recipients one sweep will handle per trigger.
 *
 * The cap is safe because dispatch is idempotent: whatever is missed this hour
 * is picked up next hour, without anything being sent twice.
 */
const PER_SWEEP = 200

/**
 * Keys already delivered for a trigger, so the sweep can skip them.
 *
 * Without this, a steady state costs one insert-and-fail per recipient per
 * run: measured at 88 seconds against a few hundred demo participants, past
 * the 60 seconds a cron invocation gets. Reading the keys once turns that back
 * into a single query. The unique constraint is still what guarantees "once" —
 * this only avoids asking it the same question hundreds of times.
 */
async function deliveredKeys(trigger: string, keys: string[]): Promise<Set<string>> {
  if (keys.length === 0) return new Set()
  const rows = await db.messageDelivery.findMany({
    where:  { trigger, idempotencyKey: { in: keys } },
    select: { idempotencyKey: true },
  })
  return new Set(rows.map(r => r.idempotencyKey))
}

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL ?? ''
const day = (d: Date) =>
  d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })

/** Everyone taking part who could still receive something. */
const ACTIVE = ['REGISTERED', 'ACTIVE'] as const

// ─── Challenge starting soon ─────────────────────────────────────────────────

/**
 * Challenges beginning within the next `hours`.
 *
 * The idempotency key carries the challenge, not the day, so a participant is
 * told once however many times the sweep runs before it starts.
 */
export async function sweepChallengeStarting(now = new Date(), hours = 24): Promise<SweepResult> {
  const result: SweepResult = { trigger: 'challenge_starting', considered: 0, sent: 0, duplicates: 0, skipped: 0, failed: 0 }
  const until = new Date(now.getTime() + hours * 3_600_000)

  const challenges = await db.challenge.findMany({
    where: {
      status:   { in: ['PUBLISHED', 'ACTIVE'] as never },
      startsAt: { gte: now, lte: until },
    },
    select: {
      id: true, title: true, startsAt: true, workspaceId: true,
      workspace: { select: { name: true } },
      participants: {
        where:  { status: { in: ACTIVE as unknown as string[] } as never },
        select: { id: true, profileId: true, profile: { select: { email: true, fullName: true } } },
      },
    },
  })

  for (const challenge of challenges) {
    await inBatches(challenge.participants, async (p) => {
      result.considered++
      const { status } = await dispatch({
        trigger:        'challenge_starting',
        workspaceId:    challenge.workspaceId,
        challengeId:    challenge.id,
        participantId:  p.id,
        profileId:      p.profileId,
        to:             p.profile.email,
        idempotencyKey: `${p.id}:challenge_starting`,
        values: {
          participantName: p.profile.fullName?.split(' ')[0] ?? p.profile.email,
          challengeTitle:  challenge.title,
          workspaceName:   challenge.workspace.name,
          startDate:       challenge.startsAt ? day(challenge.startsAt) : '',
        },
      })
      tally(result, status)
    })
  }
  return result
}

// ─── Day available ───────────────────────────────────────────────────────────

/**
 * Steps that have opened for a participant since the last sweep.
 *
 * Unlock state is recomputed from the same engine the pages use rather than
 * stored, so this cannot drift from what the participant actually sees. The
 * key is per participant per step, which is what makes re-running harmless.
 */
export async function sweepDayAvailable(now = new Date()): Promise<SweepResult> {
  const result: SweepResult = { trigger: 'day_available', considered: 0, sent: 0, duplicates: 0, skipped: 0, failed: 0 }

  const challenges = await db.challenge.findMany({
    where:  { status: { in: ['PUBLISHED', 'ACTIVE'] as never } },
    select: {
      id: true, slug: true, title: true, mode: true, timezone: true, startsAt: true,
      workspaceId: true,
      workspace: { select: { name: true } },
      steps: {
        where:   { isPublished: true },
        orderBy: { order: 'asc' },
        select:  { id: true, title: true, order: true, availableAt: true },
      },
      participants: {
        where:  { status: { in: ACTIVE as unknown as string[] } as never },
        select: {
          id: true, profileId: true, registeredAt: true,
          profile: { select: { email: true, fullName: true } },
        },
      },
    },
  })

  for (const challenge of challenges) {
    if (challenge.steps.length === 0) continue

    // Work out every step that is open for every participant first, then ask
    // once which of those have already been mailed.
    const pending: { p: (typeof challenge.participants)[number]; stepId: string }[] = []
    for (const p of challenge.participants) {
      for (const unlock of calculateUnlocks({
        mode:              challenge.mode as ChallengeMode,
        timezone:          challenge.timezone ?? 'UTC',
        challengeStartsAt: challenge.startsAt,
        enrolledAt:        p.registeredAt,
        now,
        steps: challenge.steps.map(s => ({ id: s.id, order: s.order, availableAt: s.availableAt })),
      })) {
        if (unlock.unlocked) pending.push({ p, stepId: unlock.id })
      }
    }

    const sentAlready = await deliveredKeys(
      'day_available',
      pending.map(({ p, stepId }) => `${p.id}:day_available:${stepId}`)
    )
    const todo = pending
      .filter(({ p, stepId }) => !sentAlready.has(`${p.id}:day_available:${stepId}`))
      .slice(0, PER_SWEEP)

    await inBatches(todo, async ({ p, stepId }) => {
      const step = challenge.steps.find(s => s.id === stepId)
      if (!step) return

      result.considered++
      const { status } = await dispatch({
        trigger:        'day_available',
        workspaceId:    challenge.workspaceId,
        challengeId:    challenge.id,
        participantId:  p.id,
        profileId:      p.profileId,
        to:             p.profile.email,
        idempotencyKey: `${p.id}:day_available:${step.id}`,
        values: {
          participantName: p.profile.fullName?.split(' ')[0] ?? p.profile.email,
          challengeTitle:  challenge.title,
          workspaceName:   challenge.workspace.name,
          stepTitle:       step.title,
          actionUrl:       `${APP_URL()}/c/${challenge.slug}/day/${step.order + 1}`,
        },
      })
      tally(result, status)
    })
  }
  return result
}

// ─── Live session reminder ───────────────────────────────────────────────────

export async function sweepSessionReminder(now = new Date(), hours = 24): Promise<SweepResult> {
  const result: SweepResult = { trigger: 'session_reminder', considered: 0, sent: 0, duplicates: 0, skipped: 0, failed: 0 }
  const until = new Date(now.getTime() + hours * 3_600_000)

  const sessions = await db.liveSession.findMany({
    where:  { startsAt: { gte: now, lte: until } },
    select: {
      id: true, title: true, startsAt: true,
      challenge: {
        select: {
          id: true, slug: true, title: true, workspaceId: true,
          workspace: { select: { name: true } },
          participants: {
            where:  { status: { in: ACTIVE as unknown as string[] } as never },
            select: { id: true, profileId: true, profile: { select: { email: true, fullName: true } } },
          },
        },
      },
    },
  })

  for (const session of sessions) {
    await inBatches(session.challenge.participants, async (p) => {
      result.considered++
      const { status } = await dispatch({
        trigger:        'session_reminder',
        workspaceId:    session.challenge.workspaceId,
        challengeId:    session.challenge.id,
        participantId:  p.id,
        profileId:      p.profileId,
        to:             p.profile.email,
        idempotencyKey: `${p.id}:session_reminder:${session.id}`,
        values: {
          participantName: p.profile.fullName?.split(' ')[0] ?? p.profile.email,
          challengeTitle:  session.challenge.title,
          workspaceName:   session.challenge.workspace.name,
          // The hub carries the join link; the email points at the hub so the
          // link itself never travels through a mailbox.
          actionUrl:       `${APP_URL()}/c/${session.challenge.slug}/hub`,
        },
      })
      tally(result, status)
    })
  }
  return result
}

// ─── Inactivity nudge ────────────────────────────────────────────────────────

/**
 * Participants who have submitted nothing for `days`.
 *
 * Keyed on the week rather than the participant, so someone who stays away for
 * a month gets a handful of nudges rather than one forever or one a day.
 */
export async function sweepInactivityNudge(now = new Date(), days = 3): Promise<SweepResult> {
  const result: SweepResult = { trigger: 'inactivity_nudge', considered: 0, sent: 0, duplicates: 0, skipped: 0, failed: 0 }
  const cutoff = new Date(now.getTime() - days * 86_400_000)
  const week = `${now.getUTCFullYear()}-${Math.floor(now.getTime() / 604_800_000)}`

  const participants = await db.participant.findMany({
    where: {
      status:       { in: ACTIVE as unknown as string[] } as never,
      registeredAt: { lte: cutoff },
      challenge:    { status: { in: ['PUBLISHED', 'ACTIVE'] as never } },
      submissions:  { none: { submittedAt: { gte: cutoff } } },
    },
    select: {
      id: true, profileId: true,
      profile:   { select: { email: true, fullName: true } },
      challenge: {
        select: {
          id: true, slug: true, title: true, workspaceId: true,
          workspace: { select: { name: true } },
        },
      },
    },
    take: PER_SWEEP,
  })

  const already = await deliveredKeys(
    'inactivity_nudge',
    participants.map(p => `${p.id}:inactivity_nudge:${week}`)
  )
  const due = participants.filter(p => !already.has(`${p.id}:inactivity_nudge:${week}`))

  await inBatches(due, async (p) => {
    result.considered++
    const { status } = await dispatch({
      trigger:        'inactivity_nudge',
      workspaceId:    p.challenge.workspaceId,
      challengeId:    p.challenge.id,
      participantId:  p.id,
      profileId:      p.profileId,
      to:             p.profile.email,
      idempotencyKey: `${p.id}:inactivity_nudge:${week}`,
      values: {
        participantName: p.profile.fullName?.split(' ')[0] ?? p.profile.email,
        challengeTitle:  p.challenge.title,
        workspaceName:   p.challenge.workspace.name,
        actionUrl:       `${APP_URL()}/c/${p.challenge.slug}/hub`,
      },
    })
    tally(result, status)
  })
  return result
}

// ─── Offer closing ───────────────────────────────────────────────────────────

export async function sweepOfferClosing(now = new Date(), hours = 48): Promise<SweepResult> {
  const result: SweepResult = { trigger: 'offer_closing', considered: 0, sent: 0, duplicates: 0, skipped: 0, failed: 0 }
  const until = new Date(now.getTime() + hours * 3_600_000)

  const offers = await db.offer.findMany({
    where:  { enabled: true, closesAt: { gte: now, lte: until } },
    select: {
      id: true,
      challenge: {
        select: {
          id: true, slug: true, title: true, workspaceId: true,
          workspace: { select: { name: true } },
          participants: {
            // Only people who finished are shown an offer, so only they are told
            // it is closing.
            where:  { status: 'COMPLETED' as never },
            select: { id: true, profileId: true, profile: { select: { email: true, fullName: true } } },
          },
        },
      },
    },
  })

  for (const offer of offers) {
    await inBatches(offer.challenge.participants, async (p) => {
      result.considered++
      const { status } = await dispatch({
        trigger:        'offer_closing',
        workspaceId:    offer.challenge.workspaceId,
        challengeId:    offer.challenge.id,
        participantId:  p.id,
        profileId:      p.profileId,
        to:             p.profile.email,
        idempotencyKey: `${p.id}:offer_closing:${offer.id}`,
        values: {
          participantName: p.profile.fullName?.split(' ')[0] ?? p.profile.email,
          challengeTitle:  offer.challenge.title,
          workspaceName:   offer.challenge.workspace.name,
          actionUrl:       `${APP_URL()}/c/${offer.challenge.slug}/offer`,
        },
      })
      tally(result, status)
    })
  }
  return result
}

/** Every scheduled trigger, in one pass. */
export async function sweepAll(now = new Date()): Promise<SweepResult[]> {
  return [
    await sweepChallengeStarting(now),
    await sweepDayAvailable(now),
    await sweepSessionReminder(now),
    await sweepInactivityNudge(now),
    await sweepOfferClosing(now),
  ]
}
