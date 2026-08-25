// Gamification engine — points, streaks, badges
// PRD §14 — all calculations must be auditable and idempotent
//
// DESIGN RULES:
// - Points awarded via append-only points_events with idempotency_key (UNIQUE)
// - Streak calculated from step_progress timestamps, not a stored counter
// - Badge evaluation triggered on step completion events (Inngest job)
// - Anti-abuse: comment/reaction points capped per enrollment per day
//
// TODO: Full implementation in Milestone 11 (Gamification)

export type StreakDefinition = 'calendar_day' | 'scheduled_day' | 'habit_checkin'

export type PointAction =
  | 'day_completed'
  | 'response_submitted'
  | 'file_uploaded'
  | 'feed_posted'
  | 'comment_given'
  | 'weekly_milestone'
  | 'challenge_completed'

// Illustrative defaults from PRD §14.2
export const DEFAULT_POINT_VALUES: Record<PointAction, number> = {
  day_completed: 100,
  response_submitted: 25,
  file_uploaded: 50,
  feed_posted: 15,
  comment_given: 5,
  weekly_milestone: 250,
  challenge_completed: 1000,
}

// Placeholder — implemented in Milestone 11
export async function awardPoints(_params: {
  enrollmentId: string
  challengeId: string
  action: PointAction
  sourceId: string
  idempotencyKey: string
  customPoints?: number
}): Promise<void> {
  throw new Error('Gamification not yet implemented — Milestone 11')
}

// Placeholder — implemented in Milestone 11
export function calculateStreak(
  _completionDates: Date[],
  _definition: StreakDefinition,
  _timezone: string,
  _gracePeriodHours: number
): { current: number; best: number } {
  throw new Error('Streak calculation not yet implemented — Milestone 11')
}
