// Gamification — points, streaks, badges (PRD §14, milestone 7).
//
// This file was a design note with placeholder functions that threw. The rules
// it described are now implemented:
//
//   points.ts   append-only ledger, idempotent at the database level, with the
//               per-day caps §14.4 asks for on social actions
//   badges.ts   definitions in code, awards in a row
//
// Streaks are derived from submission timestamps rather than stored, so they
// cannot drift — see getParticipantProgress.

export {
  awardPoints, totalPoints, leaderboard, POINT_VALUES,
  type PointAction, type AwardInput, type AwardResult,
} from './points'

export {
  BADGES, badgeByKey, earnedBadgeKeys,
  type BadgeDefinition, type ProgressSnapshot,
} from './badges'
