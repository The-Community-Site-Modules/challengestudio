// Enrollment schema — cohorts, teams, enrollments, step_progress
// Milestone 8: Enrollment & Scheduling
//
// ⚠️ DO NOT uncomment until migration is reviewed and approved by owner
//
// Key design rules:
//   - enrollments are idempotent: UNIQUE(challenge_id, user_id) on active enrollments
//   - step_progress.status drives unlock display — never computed on the fly from dates alone
//   - personal_start_date stored as DATE in challenge timezone (not UTC datetime)
//   - UTM fields captured at registration for analytics
//   - consent_timestamp + consent_version required for GDPR-relevant markets
//
// export const cohorts = pgTable('cohorts', { ... })
// export const teams = pgTable('teams', { ... })
// export const enrollments = pgTable('enrollments', { ... })
// export const stepProgress = pgTable('step_progress', { ... })

export {}
