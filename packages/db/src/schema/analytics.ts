// Analytics schema — analytics_events, audit_logs
// Milestone 14: Analytics
//
// ⚠️ DO NOT uncomment until migration is reviewed and approved by owner
//
// Key design rules (PRD §17, §23):
//   - analytics_events: append-only, no PII in event properties
//   - audit_logs: immutable — role changes, exports, publications, moderation, integration changes
//   - exports must be permission-checked AND logged in audit_logs
//   - error monitoring must NOT log sensitive submission content or auth secrets (PRD §23)
//
// export const analyticsEvents = pgTable('analytics_events', { ... })
// export const auditLogs = pgTable('audit_logs', { ... })

export {}
