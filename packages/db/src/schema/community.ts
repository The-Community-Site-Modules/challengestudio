// Community schema — feed_events, comments, reactions
// Milestone 10: Community
//
// ⚠️ DO NOT uncomment until migration is reviewed and approved by owner
//
// Key design rules (PRD §13.1, HC-6):
//   - feed_events is append-only — never update, only hide (is_hidden flag)
//   - All feed queries MUST paginate — 10k participants × 30 days = 300k+ events
//   - reactions has UNIQUE(target_type, target_id, user_id, reaction_type) — idempotent
//   - moderation actions (hide/remove) logged in audit_logs
//
// export const feedEvents = pgTable('feed_events', { ... })
// export const comments = pgTable('comments', { ... })
// export const reactions = pgTable('reactions', { ... })

export {}
