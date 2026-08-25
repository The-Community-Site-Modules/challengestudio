// Drizzle schema — Challenge Studio entity definitions
//
// ⚠️  IMPORTANT: This file defines the schema for review purposes only.
// DO NOT run migrations until each milestone's schema is separately reviewed
// and explicitly approved by the owner (PRD §30).
//
// Schema is organised by domain:
//   - identity     (users, sessions, accounts)
//   - tenancy      (workspaces, memberships, invitations, integrations)
//   - challenge    (challenges, steps, content_blocks)
//   - enrollment   (cohorts, teams, enrollments, step_progress)
//   - submissions  (submissions)
//   - community    (feed_events, comments, reactions)
//   - gamification (points_events, badges, badge_awards)
//   - sessions     (live_sessions)
//   - comms        (message_templates, message_deliveries)
//   - offers       (offers)
//   - analytics    (analytics_events, audit_logs)
//   - storage      (uploads)
//
// Each domain will be fleshed out in its corresponding milestone.
// This file re-exports all tables once they are defined.

// ─── Milestone 2: Identity & Tenancy ───────────────────────────────────────
// export * from './identity'
// export * from './tenancy'

// ─── Milestone 4: Challenge Domain ─────────────────────────────────────────
// export * from './challenge'

// ─── Milestone 8: Enrollment & Scheduling ──────────────────────────────────
// export * from './enrollment'

// ─── Milestone 9: Participant Experience ───────────────────────────────────
// export * from './submissions'

// ─── Milestone 10: Community ───────────────────────────────────────────────
// export * from './community'

// ─── Milestone 11: Gamification ────────────────────────────────────────────
// export * from './gamification'

// ─── Milestone 12: Live Sessions ───────────────────────────────────────────
// export * from './live-sessions'

// ─── Milestone 13: Communications ──────────────────────────────────────────
// export * from './comms'

// ─── Milestone 14: Analytics ───────────────────────────────────────────────
// export * from './analytics'

// Placeholder export so TypeScript doesn't error on empty module
export const SCHEMA_VERSION = '0.0.1'
