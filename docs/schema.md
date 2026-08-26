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

## Applied Migrations (Supabase SQL Editor)

These run manually, in order. They are not Prisma migration folders, so
`prisma migrate deploy` will not apply them — a new environment needs them run
by hand.

| File | Purpose | Status |
|---|---|---|
| `20260812211832_init/` | Base tables | Applied (Prisma) |
| `add_workspace_timezone.sql` | `workspaces.timezone` | ✅ Applied 2026-08-25 |
| `add_challenge_fields.sql` | Wizard fields on `challenges` | ✅ Applied 2026-08-26 |
| `add_workspace_invitations.sql` | Invitations table + RLS | ⚠️ **Not run** |
| `rls_policies.sql` | RLS across the base tables | ⚠️ **Not run** — RLS is ON but zero policies exist |
| `auth_trigger.sql` | Auto-create profile on signup + backfill | ✅ Applied 2026-08-25 |
| `auth_delete_trigger.sql` | Delete profile when account is deleted | ✅ Applied 2026-08-25 |
| `fix_invitation_rls.sql` | **Drops a world-readable policy** | ⚠️ **Not yet run** |

## What RLS does and does not cover

Two paths reach these tables and only one is governed by RLS:

- **Browser → PostgREST** with the publishable key, as `anon`/`authenticated` —
  RLS applies. This is the surface the policies defend.
- **Server → Prisma** with `DATABASE_URL`, as `postgres` (the table owner) —
  **RLS does not apply.** Postgres exempts a table owner from its own policies
  unless the table is set to `FORCE ROW LEVEL SECURITY`.

Forcing RLS is not the fix: every policy is written against `auth.uid()`, which
reads a Supabase JWT claim. Prisma's pooler connection carries no JWT, so
`auth.uid()` would be NULL and every application query would return nothing.

The consequence is that for anything the app itself does, the capability checks
in `src/lib/permissions` are the enforcement layer, not a second line of
defence. **Every server action that touches tenant data must scope its queries
by `workspace_id`.** Covered by `src/app/(workspace)/tenant-isolation.test.ts`.

## Review Process

For each milestone, a separate schema review document will be prepared showing:
- Proposed column definitions with types
- Indexes
- Foreign key relationships
- Migration SQL preview
- Rollback plan

No migration runs until the owner signs off on that document.
