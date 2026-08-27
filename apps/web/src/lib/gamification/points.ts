/**
 * The points ledger (milestone 7).
 *
 * Build Plan data rule 2: points are append-only and progress is *derived*
 * from the ledger rather than mutated in place, so a total can always be
 * recomputed and every point traced to what earned it.
 *
 * Two things follow from that:
 *
 *   Idempotency is enforced by the database, not by caller discipline. Every
 *   award carries a key unique to the thing that caused it, so re-running a
 *   completion — a double click, a retried job — adds nothing. The caller does
 *   not have to remember; it cannot get it wrong.
 *
 *   Anti-abuse caps (PRD §14.4) are counted from the ledger too. Posting
 *   twenty times in an evening earns points for the first few and nothing
 *   after, without anything having to be reset at midnight.
 */

import { db } from '@/lib/db'

export type PointAction =
  | 'day_completed'
  | 'response_submitted'
  | 'challenge_completed'
  | 'feed_posted'
  | 'comment_given'

/** Illustrative defaults from PRD §14.2. */
export const POINT_VALUES: Record<PointAction, number> = {
  day_completed:       100,
  response_submitted:   25,
  challenge_completed: 1000,
  feed_posted:          15,
  comment_given:         5,
}

/**
 * How many times a day an action can earn anything.
 *
 * Completing a day is naturally capped by there being only so many days, so it
 * is uncapped here. Social actions are not, which is exactly what §14.4 warns
 * about — points should reward taking part, not repetition.
 */
const DAILY_CAP: Partial<Record<PointAction, number>> = {
  feed_posted:   3,
  comment_given: 5,
}

export interface AwardInput {
  workspaceId: string
  challengeId: string
  participantId: string
  action: PointAction
  /** The row that caused this — a step id, a post id. */
  sourceId?: string
  /**
   * Unique per thing-that-happened. Defaults to action + sourceId, which is
   * right whenever the same source can only earn once (completing step X).
   * Pass your own for actions that legitimately repeat.
   */
  idempotencyKey?: string
  /** Overrides the default for this action — a step's own pointsXp. */
  points?: number
  now?: Date
}

export interface AwardResult {
  awarded: boolean
  points: number
  /** Set when nothing was awarded, so callers can say why. */
  reason?: 'duplicate' | 'daily_cap'
}

/** Start of the current UTC day — the window daily caps are counted over. */
function dayStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

export async function awardPoints(input: AwardInput): Promise<AwardResult> {
  const { workspaceId, challengeId, participantId, action, sourceId } = input
  const now = input.now ?? new Date()
  const points = input.points ?? POINT_VALUES[action]
  const key = input.idempotencyKey ?? `${participantId}:${action}:${sourceId ?? 'none'}`

  const cap = DAILY_CAP[action]
  if (cap !== undefined) {
    const todaySoFar = await db.pointsEvent.count({
      where: { participantId, action, createdAt: { gte: dayStart(now) } },
    })
    if (todaySoFar >= cap) return { awarded: false, points: 0, reason: 'daily_cap' }
  }

  try {
    await db.pointsEvent.create({
      data: {
        workspaceId, challengeId, participantId, action, points,
        idempotencyKey: key,
        ...(sourceId ? { sourceId } : {}),
      },
    })
    return { awarded: true, points }
  } catch (e) {
    // P2002 on idempotency_key means this exact thing already earned. That is
    // the mechanism working, not a failure, so it is not re-thrown.
    if (isUniqueViolation(e)) return { awarded: false, points: 0, reason: 'duplicate' }
    throw e
  }
}

function isUniqueViolation(e: unknown): boolean {
  return typeof e === 'object' && e !== null && 'code' in e &&
    (e as { code?: string }).code === 'P2002'
}

/** A participant's total, summed from the ledger rather than read off a counter. */
export async function totalPoints(participantId: string): Promise<number> {
  const result = await db.pointsEvent.aggregate({
    where: { participantId },
    _sum: { points: true },
  })
  return result._sum.points ?? 0
}

/** Standings for one challenge, highest first. */
export async function leaderboard(challengeId: string, take = 50) {
  const rows = await db.pointsEvent.groupBy({
    by: ['participantId'],
    where: { challengeId },
    _sum: { points: true },
    orderBy: { _sum: { points: 'desc' } },
    take,
  })
  return rows.map((r) => ({
    participantId: r.participantId,
    points: r._sum.points ?? 0,
  }))
}
