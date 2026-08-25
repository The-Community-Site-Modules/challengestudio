// Gamification schema — points_events, badges, badge_awards
// Milestone 11: Gamification
//
// ⚠️ DO NOT uncomment until migration is reviewed and approved by owner
//
// Key design rules (PRD §14.2):
//   - points_events has UNIQUE(idempotency_key) — prevents double-awarding on retries
//   - points are event-sourced: total = SUM(points_delta) not a stored counter
//   - badges evaluated by Inngest job triggered on step completion
//   - anti-abuse: comment/reaction points checked via daily cap query before insert
//
// export const pointsEvents = pgTable('points_events', { ... })
// export const badges = pgTable('badges', { ... })
// export const badgeAwards = pgTable('badge_awards', { ... })

export {}
