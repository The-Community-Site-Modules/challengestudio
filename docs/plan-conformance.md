# Conformance with the technical build plan

Where the built product matches [the plan](plan/technical-build-plan.md), and
where it does not. Checked against the codebase on **2026-08-29**, after
Milestone 11.

The plan is a planning document, not a contract — divergence is allowed. What
is not allowed is silent divergence, which is what this file exists to
prevent. Re-check it when the plan is revised or a milestone closes.

---

## §1 Three loops

Build, Run and Grow all work end to end and are covered by the E2E suite.
No divergence.

## §2 Technology stack

| Layer | Plan | Built | |
|---|---|---|---|
| Framework | Next.js App Router, TypeScript | 15.1.6, strict | ✅ |
| Hosting | Vercel, dev/preview/prod | not deployed | ⛔ blocked on owner |
| Database | Postgres (Neon, Supabase or Vercel) | Supabase | ✅ |
| ORM | Prisma **or** Drizzle | Prisma 7 | ✅ [OD-06](decisions/OD-06-orm.md) |
| Auth | Auth.js **or** Clerk | **Supabase Auth** | ⚠️ [OD-07](decisions/OD-07-auth.md) |
| File storage | Signed URLs, ownership metadata | throws by design | ⛔ [OD-02](decisions/OD-02-storage.md) |
| Email | Provider-abstracted (Resend) | abstraction built; no API key | 🟡 [OD-03](decisions/OD-03-email.md) |
| Background jobs | Vercel Cron **+ Inngest/QStash** | Vercel Cron alone | ⚠️ [OD-04](decisions/OD-04-jobs.md) |
| Validation | Zod, shared client and server | **no Zod in the application** | ❌ see below |
| Testing | Vitest + Playwright | 363 unit, 50 E2E | ✅ |
| Monitoring | Sentry with PII scrubbing | installed, unwired | ❌ |
| Rate limiting | Upstash or equivalent | built, with in-process fallback | ✅ |

### Zod is not used

The plan asks for Zod schemas shared between client and server, specifically
for block-type-specific content payloads (§2, PRD §22.2). `packages/validators`
contains Zod but **the application does not import it**. Wizard validation is
hand-written in `challenges/new/_context/validation.ts` and is well covered by
27 tests, but content-block payloads reach the `Json` column unvalidated.

Not currently causing bugs. It is the gap most likely to produce one, because
a malformed block payload fails at render time in a participant's browser
rather than at the boundary.

## §3 Domain / module structure

The plan asks for `/domains/*`, each owning its data access, with the rule
that **nothing outside a domain touches its tables directly**.

Built: domain logic lives in `apps/web/src/lib/<domain>` — `enrollment`,
`gamification`, `communications`, `analytics`, `permissions`, `rate-limit`.
Server actions are colocated with the routes that use them.

**The rule is not held.** 34 route files import `db` and query Prisma
directly.

This is not academic. The cross-tenant hole found and fixed in Milestone 11
(`challenges/cross-tenant.test.ts`) existed precisely because the scoping rule
lived in every caller instead of in one place: nine actions each had to
remember to check that the id they were handed belonged to the workspace, and
none of them did. Had `challenge-authoring` owned its own data access, one
helper would have fixed all nine.

## §4 Data model

21 models. The three non-negotiable rules hold:

- ✅ Every tenant-owned row carries `workspace_id` or resolves to one through
  its parent.
- ✅ `points_events` is append-only, with a unique idempotency key.
- ✅ Dates in UTC, challenge timezone stored separately and applied at unlock.

Tables in the plan that do not exist:

| Plan | Reality |
|---|---|
| `cohorts`, `teams` | Post-MVP per PRD §25. Deliberate. |
| `enrollments` | `Participant` serves this role. Naming divergence only. |
| **`step_progress`** | **Absent.** Progress derives from `submissions`. |
| `feed_events` | `FeedPost` + `FeedComment`. Naming divergence only. |
| `analytics_events` | Absent — metrics are counted from records at read time. |
| `uploads` | Blocked with storage. |

### step_progress is the real divergence

The plan requires progress to be derived from an **append-only** event table.
It is derived — but from `submissions`, which is one mutable row per
(participant, step): `updatedAt`, `feedback`, `reviewedAt` are written onto
it after the fact.

Nothing has gone wrong because of this. What the plan was buying, and this
does not, is the ability to reconstruct *when* a participant did each thing
after a row has been edited.

`analytics_events` is a deliberate departure and a better one: counting from
the records means a creator's totals cannot drift from the underlying
registrations and completions, which is what PRD §27 actually asks for.

## §5 Authorization

Matches the plan exactly. `hasPermission(user, workspace, capability)`; roles
are named bundles of capability strings; no `role === 'admin'` anywhere in the
codebase. Covered by its own tests and by the E2E permission spec.

## §6 Scheduling — four of six timing models

| Model | |
|---|---|
| Fixed calendar | ✅ |
| Rolling enrollment | ✅ |
| Open access | ✅ |
| **Sequential completion** | ❌ not implemented |
| Scheduled release | ✅ (`step.availableAt`) |
| **Weekly release** | ❌ not implemented |

Both gaps need new schema fields. The listed edge cases — DST transitions,
mid-challenge joins, challenge timezone winning over the device — are covered
by `lib/enrollment/unlock.test.ts`.

## §7 Milestones

All eleven complete. Milestone 1's deploy pipeline is the one piece still
outstanding within them, and it is blocked on the owner.

## §8 Open decisions

| Plan's question | State |
|---|---|
| ORM: Prisma vs Drizzle | ✅ Prisma — [OD-06](decisions/OD-06-orm.md) |
| Database: Neon vs Supabase vs Vercel | ✅ Supabase — [OD-01](decisions/OD-01-database.md) |
| Auth: Auth.js vs Clerk | ⚠️ Neither — [OD-07](decisions/OD-07-auth.md) |
| Jobs: Cron alone vs Cron + queue | ⚠️ Cron alone — [OD-04](decisions/OD-04-jobs.md) |
| Custom domains in MVP | ❌ Still open — [OD-08](decisions/OD-08-custom-domains.md) |
| Email provider sign-off | 🟡 Resend in code, unsigned — [OD-03](decisions/OD-03-email.md) |

## §9 Exclusions

Nothing excluded has been built: no payments or checkout, no AI generation, no
Zoom OAuth, no SMS or push, no mobile app, no public API, no embedded
Community Site. The `/pricing` page describes plans but reaches no checkout,
which is the line §9 draws.

The plan also warns against premature scaffolding (§30). Dead scaffolding
found during this audit — a duplicate unlock engine, an Auth.js route, an
Inngest handler, three unused workspace packages — was removed on 2026-08-29.
What remains and is genuinely awaiting a decision is listed in
[`production-checklist.md`](production-checklist.md).
