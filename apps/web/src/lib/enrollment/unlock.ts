/**
 * The unlock calculation engine (Build Plan §7, milestone 5).
 *
 * When does a participant get to see step N?
 *
 * This lived inline inside a data-fetching function, which meant it could not
 * be tested and every caller re-derived it. Build Plan §28 asks for schedule
 * and unlock math to be covered by tests; that is only possible if the maths
 * is somewhere a test can reach.
 *
 * Two rules drive everything here:
 *
 *   Data rule 3 — "Dates stored in UTC; challenge timezone stored separately
 *   and applied at read/unlock time." A day boundary is a *local* midnight in
 *   the challenge's timezone, not the server's. Day 2 of a challenge run from
 *   Karachi opens at 00:00 PKT for everyone, wherever they and the server are.
 *
 *   §1.2 — the loop runs "once per participant per day (or per personal Day 1
 *   in evergreen mode)". So some modes are anchored to the challenge's start
 *   date and some to each participant's own enrolment.
 */

export type ChallengeMode =
  | 'SELF_PACED' | 'COHORT' | 'LIVE_EVENT' | 'DRIP' | 'SPRINT' | 'EVERGREEN'

export interface StepSchedule {
  id: string
  /** 0-based position. Step at order N unlocks N days after the anchor. */
  order: number
  /** An explicit instant for this step, if the creator set one. */
  availableAt: Date | null
}

export interface UnlockInput {
  mode: ChallengeMode
  /** IANA zone, e.g. "Asia/Karachi". Falls back to UTC if unrecognised. */
  timezone: string
  /** The challenge's own start, for modes where everyone moves together. */
  challengeStartsAt: Date | null
  /** When this participant enrolled — their personal Day 1. */
  enrolledAt: Date
  now: Date
  steps: StepSchedule[]
}

export interface StepUnlock {
  id: string
  unlocked: boolean
  /** When it opens, or null if it is open with no waiting involved. */
  unlocksAt: Date | null
}

/**
 * Modes where every participant moves together on the challenge's calendar.
 * The rest run from each participant's own enrolment, so someone joining an
 * evergreen challenge in March starts at their Day 1, not the challenge's.
 */
const COHORT_ANCHORED: ReadonlySet<ChallengeMode> = new Set<ChallengeMode>([
  'COHORT', 'SPRINT', 'LIVE_EVENT', 'DRIP',
])

/** The offset of a zone from UTC at a given instant, in milliseconds. */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  const p: Record<string, number> = {}
  for (const { type, value } of dtf.formatToParts(instant)) {
    if (type !== 'literal') p[type] = Number(value)
  }
  // Intl gives hour 24 for midnight in some engines; Date.UTC normalises it.
  const asUtc = Date.UTC(
    p.year ?? 1970, (p.month ?? 1) - 1, p.day ?? 1,
    p.hour ?? 0, p.minute ?? 0, p.second ?? 0
  )
  return asUtc - instant.getTime()
}

/** The calendar date an instant falls on, as seen in the given zone. */
function localDateParts(instant: Date, timeZone: string) {
  const offset = zoneOffsetMs(instant, timeZone)
  const shifted = new Date(instant.getTime() + offset)
  return {
    year:  shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day:   shifted.getUTCDate(),
  }
}

/**
 * The instant at which local midnight occurs, `addDays` after the local date
 * that `anchor` falls on.
 *
 * The offset is resolved twice because the target day may sit on the other
 * side of a DST change from the anchor: the first pass finds the right day,
 * the second finds that day's own offset. Without it, a challenge crossing a
 * clock change unlocks an hour early or late.
 */
function localMidnightAfter(anchor: Date, addDays: number, timeZone: string): Date {
  const { year, month, day } = localDateParts(anchor, timeZone)
  const naive = Date.UTC(year, month, day + addDays)
  const guess = new Date(naive - zoneOffsetMs(anchor, timeZone))
  return new Date(naive - zoneOffsetMs(guess, timeZone))
}

/** An unknown zone must not throw at read time; UTC is the safe fallback. */
function safeZone(timeZone: string): string {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date())
    return timeZone
  } catch {
    return 'UTC'
  }
}

/**
 * Which of a challenge's steps this participant can open, and when the rest do.
 *
 * Precedence:
 *   1. An explicit `availableAt` on the step always wins. A creator who set a
 *      date meant it, whatever the mode.
 *   2. Otherwise the step at order N opens at local midnight N days after the
 *      anchor — the challenge start for cohort-style modes, the participant's
 *      enrolment for self-paced and evergreen.
 *   3. With no anchor at all there is nothing to wait for, so it is open.
 */
export function calculateUnlocks(input: UnlockInput): StepUnlock[] {
  const { mode, challengeStartsAt, enrolledAt, now, steps } = input
  const zone = safeZone(input.timezone)

  const anchor = COHORT_ANCHORED.has(mode) ? challengeStartsAt : enrolledAt

  return steps.map((step) => {
    if (step.availableAt) {
      return {
        id: step.id,
        unlocked: step.availableAt <= now,
        unlocksAt: step.availableAt,
      }
    }

    if (!anchor) {
      // A cohort challenge with no start date has not been scheduled yet.
      // Withholding the content would strand the participant, so it opens.
      return { id: step.id, unlocked: true, unlocksAt: null }
    }

    const opensAt = localMidnightAfter(anchor, step.order, zone)

    // Day 1 is the anchor's own day, and the anchor may be midday. Rounding it
    // down to midnight would be right; rounding the *participant's* enrolment
    // down would open Day 1 before they enrolled, which is harmless — but a
    // cohort start later today should not already count as opened.
    const unlocked = opensAt <= now || (step.order === 0 && anchor <= now)

    return { id: step.id, unlocked, unlocksAt: opensAt }
  })
}

/** Convenience for callers that only want the open/closed answer per step id. */
export function unlockMap(input: UnlockInput): Map<string, StepUnlock> {
  return new Map(calculateUnlocks(input).map((u) => [u.id, u]))
}
