# Challenge Studio — Schema Documentation

> All schema files live in `packages/db/src/schema/`.
> Each file is a placeholder until the milestone review is approved.
> DO NOT apply any migration without explicit owner approval (PRD §30).

## Domain Files

| File | Domain | Milestone |
|---|---|---|
| `identity.ts` | users, sessions, accounts | Milestone 2 |
| `tenancy.ts` | workspaces, memberships, invitations, integrations | Milestone 2 |
| `challenge.ts` | challenges, challenge_steps, content_blocks | Milestone 4 |
| `enrollment.ts` | cohorts, teams, enrollments, step_progress | Milestone 8 |
| `submissions.ts` | submissions, uploads | Milestone 9 |
| `community.ts` | feed_events, comments, reactions | Milestone 10 |
| `gamification.ts` | points_events, badges, badge_awards | Milestone 11 |
| `analytics.ts` | analytics_events, audit_logs | Milestone 14 |

## Critical Rules

1. **Tenant isolation**: Every record must carry `workspace_id`
2. **Idempotency keys**: `points_events` and `message_deliveries` have UNIQUE idempotency keys
3. **Private visibility**: `submissions.visibility` checked at query level — never bypassed
4. **Soft deletes**: Used for challenges and enrollments that have participant history
5. **Timezones**: All dates stored with timezone. `challenge.timezone` stored as IANA string
6. **Integration IDs**: Namespaced by provider+tenant to prevent cross-tenant leakage

## Review Process

For each milestone, a separate schema review document will be prepared showing:
- Proposed column definitions with types
- Indexes
- Foreign key relationships
- Migration SQL preview
- Rollback plan

No migration runs until the owner signs off on that document.
