// Challenge scheduling and unlock calculation — PRD §6.1, §6.2
//
// CRITICAL: All date math must use date-fns-tz — never raw UTC arithmetic
// across DST boundaries. Timezone stored on challenge record (IANA format).
//
// Timing models:
//   fixed_calendar     — all participants share same active day
//   rolling_enrollment — each participant has personal Day 1
//   open_access        — all published steps available immediately
//   sequential         — next step unlocks after completion
//   scheduled_release  — step has explicit unlock_at timestamp
//   weekly_release     — steps unlock by week number
//
// TODO: Full implementation in Milestone 8 (Enrollment & Scheduling)
// Tests must cover: DST transitions, grace periods, streak edge cases

export type TimingModel =
  | 'fixed_calendar'
  | 'rolling_enrollment'
  | 'open_access'
  | 'sequential_completion'
  | 'scheduled_release'
  | 'weekly_release'

export type StepUnlockStatus = 'locked' | 'available' | 'completed'

// Placeholder — full implementation in Milestone 8
export function calculateUnlockStatus(
  _timingModel: TimingModel,
  _stepDayNumber: number,
  _challengeStartsAt: Date,
  _challengeTimezone: string,
  _enrollmentPersonalStartDate: Date | null,
  _lastCompletedStepPosition: number,
  _stepUnlockAt: Date | null,
  _gracePeriodHours: number
): StepUnlockStatus {
  throw new Error('Scheduling not yet implemented — Milestone 8')
}
