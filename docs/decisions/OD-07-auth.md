# OD-07: Authentication provider

**Status:** ⚠️ Decided — Supabase Auth. **This was not one of the plan's
options.** Recorded retrospectively 2026-08-29.
**Plan reference:** §2, §8 item 3

## The question

The plan offered two: Auth.js/NextAuth (full control) or Clerk (faster, less
custom, recurring cost).

## What was built: Supabase Auth (`@supabase/ssr`)

A third option, chosen during Milestone 2 and never written down until now.
That is the part worth flagging — the decision itself is defensible, its
silence was not.

**Why it holds up:**

- The database is already Supabase. Auth in the same project means one vendor,
  one dashboard, and `auth.users.id` as the primary key on `profiles` with a
  real foreign key rather than an id synced across two systems.
- Sessions refresh in middleware on every request via `@supabase/ssr`, which
  is what the plan wanted from "server-verified".
- No recurring per-seat cost, unlike Clerk.

**What it cost:**

- The plan's §8 question is answered by something the plan did not list, so
  anyone reading the plan alone will expect Auth.js and not find it.
- Supabase Auth is not a policy layer. The plan's requirement for
  capability-based authorization is met separately by `lib/permissions`, which
  is where all of it lives — see [OD-05 note in
  plan-conformance.md](../plan-conformance.md) §5.
- Account recovery, email verification and magic links are Supabase's
  templates, not ours, until a sending domain is verified (OD-03).

## The trap this leaves behind

Seeding a test user by inserting into `auth.users` directly **must** set the
token columns (`confirmation_token`, `recovery_token`, `email_change`, and
the rest) to empty strings rather than NULL. GoTrue scans them into
non-nullable Go strings and a NULL fails sign-in with "Database error querying
schema", which looks like a broken login page rather than a broken fixture.
`apps/web/e2e/fixture.ts` documents this at the point it matters.

## If this is ever revisited

Moving to Auth.js or Clerk means re-homing `profiles.id`, which is referenced
by participants, memberships and workspaces. It is a migration, not a swap.
