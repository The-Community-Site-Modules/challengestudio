# Challenge Studio — Technical Build Plan
**Companion to:** Challenge Studio Product Requirements & Build Brief v1.0
**Purpose:** Translate the PRD into an architecture, technology stack, workflows, and phased build structure a developer (or Claude Code) can execute against.
**Status:** Planning document — no implementation or database migrations authorized by this file.

---

## 1. How the Product Actually Works (End-to-End Workflow)

Think of Challenge Studio as three connected engines sharing one data model: **Build → Run → Grow**.

### 1.1 The Creator Loop (Build)
```
Workspace → Challenge Wizard → Steps/Content Blocks → Publish
   │             │                    │                  │
   owner sets   9-step config      ordered daily        validation gate:
   branding     (foundation →      content w/ blocks    schedule, ≥1 step,
                review)            (video, task,         public-page fields
                                    upload, etc.)         all checked
```
A workspace owner configures a challenge once through the wizard (Section 9.2 of the PRD). The output is a `challenge` record + ordered `challenge_steps`, each built from `content_blocks`. Nothing is publicly visible until it passes the publish validation gate.

### 1.2 The Participant Loop (Run)
```
Public visitor → Register → Confirm → Enroll → Daily unlock loop → Complete → Offer
                                          │
                          ┌───────────────┴───────────────┐
                          │  Day N unlocked (by schedule)  │
                          │  → consume content blocks      │
                          │  → submit required work        │
                          │  → discuss / react              │
                          │  → mark complete → points/streak│
                          │  → Day N+1 gates open           │
                          └───────────────────────────────┘
```
This loop runs once per participant per day (or per personal Day 1 in evergreen mode). Every completion event is **durable and auditable** — it writes to `step_progress` and `points_events` rather than mutating a counter in place, so nothing can be double-awarded or silently lost.

### 1.3 The Growth Loop (Grow)
```
feed_events + points_events + submissions
        │
        ├─→ Community feed (social reinforcement)
        ├─→ Gamification (streaks, badges, leaderboard)
        ├─→ Notifications (nudges, reminders, celebrations)
        └─→ Analytics (funnel: registered → activated → completed → offer click)
```
This is what makes the product feel like "momentum" rather than a checklist — the same underlying events power the social feed, the gamification layer, the emails, and the dashboard simultaneously.

### 1.4 Why this shape matters
The PRD's core architectural instruction (Section 22) is **domain separation**: Identity, Challenge Authoring, Enrollment/Scheduling, Participation, Community, Gamification, Communications, Analytics, and Integrations are treated as distinct domains that talk to each other through defined interfaces — *not* one big tangled CRUD app. This is what makes the later Community Site integration (Section 20) possible without a rewrite: the integration domain is just another consumer of the same challenge/participation domains, swapping "standalone identity" for "Community Site identity."

---

## 2. Technology Stack — and Why

| Layer | Choice | Why this fits the PRD's requirements |
|---|---|---|
| **Framework** | Next.js (App Router), TypeScript | PRD explicitly requests this (19.1). App Router gives server components for admin/creator screens (heavy data, low interactivity) and client components for the participant hub (progress, streaks, real-time-feel). TypeScript is non-negotiable given the size of the domain model (30+ entities) — it catches cross-domain mistakes (e.g., passing a `workspace_id` where a `challenge_id` is expected) at compile time. |
| **Hosting** | Vercel, with separate dev/preview/prod environments | Explicit PRD requirement (19, 29.1, 33). Preview deployments per branch are also what makes "milestone discipline" (29.1) reviewable — the owner can click a link instead of trusting a status update. |
| **Database** | PostgreSQL (via Neon, Supabase, or Vercel Postgres — owner to select) | Relational integrity is required for a multi-tenant system with strict tenant isolation (23), auditable points events (14.2), and idempotent registration/completion (22.2). A relational DB with row-level foreign keys makes tenant-isolation testing (28) provable rather than convention-based. |
| **ORM** | Prisma or Drizzle | Either works; Drizzle is lighter-weight and closer to raw SQL, which helps because points/progress logic needs precise, auditable queries. Prisma is more ergonomic for the large schema. This is a genuine open decision — see Section 8. |
| **Auth** | Auth.js (NextAuth) or Clerk, session-based, server-verified | PRD requires "authentication and account recovery," "workspace invitations," and — critically — **capability-based permissions**, not role-name checks (7.1). Whatever auth library is chosen, the actual authorization decision must be made server-side against a `permissions` table/policy layer, never inferred from a client-supplied role claim. |
| **File storage** | Vercel Blob or S3-compatible object storage, signed URLs | PRD requires ownership metadata, access policy, and size/type limits per upload (21.1, 23). Signed, time-limited URLs prevent private submissions or session join-links from being publicly guessable (16, 23). |
| **Email** | Provider-abstracted transactional email (Resend suggested, per 32) behind an internal interface | PRD explicitly wants an *abstraction*, not a hard dependency (19, 32) — so the provider can change without touching trigger/template logic. This also makes `message_deliveries` (21) a clean, provider-agnostic log. |
| **Background jobs / scheduling** | Vercel Cron + a queue (e.g., Inngest or QStash) for unlocks, reminders, nudges | Daily unlocks, inactivity nudges, and "offer closing" emails are time-triggered, not request-triggered (15, 16). A durable job runner is required so a missed cron tick doesn't silently skip a day's notifications. |
| **Validation** | Zod schemas shared between client and server | Content-block payloads are structured and block-type-specific (11); Zod lets the same schema validate the builder UI and the API boundary, per the "validation of structured content-block payloads" requirement (22.2). |
| **Testing** | Vitest/Jest (unit), Playwright (E2E) | Matches the PRD's explicit test plan (28): schedule/unlock math, point idempotency, permission decisions, cross-tenant isolation, and full creator/participant E2E flows. |
| **Monitoring** | Sentry (or equivalent) with PII scrubbing | PRD requires error monitoring that never logs sensitive submission content or auth secrets (23). |
| **Rate limiting / abuse control** | Upstash Ratelimit or equivalent, applied to public registration + social actions | Explicit requirement (22.2) for public-form spam protection and anti-abuse limits on comments/reactions (14.4). |

**Not part of MVP stack, deliberately:** Stripe/native billing, Zoom OAuth, SMS/push providers, video hosting, AI services — all listed as post-MVP (24.2) and should not be scaffolded prematurely, since that's exactly the kind of scope-creep the PRD's guardrails (30) warn against.

---

## 3. Domain / Module Structure (Codebase Shape)

```
/app
  /(marketing)                → public marketing site (2, 26)
  /(auth)                     → signup, login, verify, invite accept
  /(workspace)/[workspaceId]  → creator admin: dashboard, wizard, builder,
                                 participants, cohorts, submissions, community,
                                 live-sessions, communications, rewards, offer,
                                 analytics, settings, preview
  /c/[challengeSlug]          → public + participant-facing challenge routes:
                                 registration, confirmation, welcome, hub,
                                 day/[step], feed, leaderboard, offer, completion
  /account                    → participant account: my challenges, profile,
                                 notification preferences
  /admin                      → platform-owner tooling: workspaces, flags,
                                 support, audit, system status
  /api
    /webhooks/[provider]      → email, storage, (future) billing
    /integrations/community-site
                               → signed install/launch/callback endpoints

/domains
  /identity          → auth, session, workspace membership, permission checks
  /challenge-authoring→ challenge/step/block CRUD, validation, publish lifecycle
  /enrollment         → registration, cohort assignment, unlock calculation
  /participation       → progress, submissions, reflections, completion
  /community          → feed, comments, reactions, moderation
  /gamification        → points events, streaks, badges, leaderboard
  /communications      → templates, trigger evaluation, delivery, preferences
  /analytics           → event collection, aggregates, exports
  /integrations         → Community Site contract, provider adapters
  /platform            → plans/flags/support/audit (platform-owner surface)

/lib          → shared utilities: db client, permission policy engine, zod schemas
/tests        → unit, integration, e2e
```

Each `/domains/*` folder owns its own data-access functions; nothing outside a domain touches its tables directly. This is what lets the Community Site integration later swap out `identity` without touching `participation` or `gamification`.

---

## 4. Core Data Model (Conceptual — Not a Migration)

Grouped by the domains above, matching PRD Section 21:

- **Identity/Tenancy:** `users`, `workspaces`, `workspace_memberships`, `integrations/installations`
- **Authoring:** `challenges`, `challenge_steps`, `content_blocks`
- **Enrollment:** `cohorts`, `teams`, `enrollments`
- **Participation:** `step_progress`, `submissions`
- **Community:** `comments/reactions`, `feed_events`
- **Gamification:** `points_events`, `badges/badge_awards`
- **Communications:** `message_templates`, `message_deliveries`
- **Live/Offer:** `live_sessions`, `offers`
- **Analytics/Ops:** `analytics_events`, `audit_logs`

**Non-negotiable data rules carried into the schema design:**
1. Every tenant-owned row carries a `workspace_id` (or resolves to one) for row-level isolation.
2. `points_events` and `step_progress` are append-only/event-sourced where practical — progress is *derived*, not directly mutated, so it's auditable and recalculable.
3. Dates stored in UTC; challenge timezone stored separately and applied at read/unlock time.
4. External integration IDs are namespaced `(provider, tenant_id, external_id)` to avoid collisions.
5. Uploads carry owner, access policy, media type, size, and deletion status — never bare file URLs.

---

## 5. Authorization Model

Capability-based, not role-name based (PRD 7.1). Concretely:

- A `permissions` policy layer maps `(user, workspace, resource)` → a set of capability strings (`challenge.publish`, `submission.review`, `billing.manage`, etc.).
- Roles (owner, admin, manager, facilitator, participant) are just **named bundles** of capabilities — the code never does `if (role === 'admin')`, it does `if (can(user, 'challenge.publish', challengeId))`.
- This is what makes the later Community Site integration safe: entitlement checks (20.3) plug into the same `can()` interface instead of a parallel ad-hoc check.

---

## 6. Scheduling / Unlock Logic (High-Risk Area — Needs Explicit Spec)

Six timing models must be supported by one calculation function (6.1):

| Model | Unlock rule |
|---|---|
| Fixed calendar | `today (challenge tz) >= step.unlock_date` |
| Rolling enrollment | `today (participant tz or challenge tz) >= enrollment.start_date + step.offset_days` |
| Open access | always unlocked once published |
| Sequential | previous required step has `step_progress.completed_at` |
| Scheduled release | `now >= step.scheduled_at` (exact timestamp) |
| Weekly release | `today >= week_start + step.week_offset` |

**Edge cases that must be tested (28):** DST transitions, participant joining mid-challenge, grace/catch-up windows, "today" computed in the *challenge's* timezone vs. the *participant's* device timezone (challenge tz should win, per 21.1), and idempotent unlock evaluation (re-running the calculation must never re-fire notifications already sent).

---

## 7. MVP Milestone Sequence

Each milestone should end in a demonstrable preview deployment (29.1).

1. **Foundation** — repo, Next.js/TS scaffold, CI, environments, empty deploy pipeline.
2. **Identity & tenancy** — signup/login, workspace creation, invitations, permission engine.
3. **Challenge authoring** — wizard, step/block builder, draft/publish lifecycle + validation.
4. **Public funnel** — registration page, confirmation, welcome/orientation.
5. **Enrollment & scheduling** — enrollment record creation, unlock calculation engine + tests.
6. **Participation** — challenge hub, daily page, submissions/uploads, completion, progress.
7. **Community & gamification** — feed/comments/reactions + moderation, points/streaks/badges.
8. **Communications** — templates, trigger evaluation, delivery log, preferences.
9. **Live sessions & offer** — session records, join/replay links, external CTA offer page.
10. **Analytics** — creator dashboard metrics, participant-level view, export.
11. **Hardening** — accessibility pass, cross-tenant security tests, E2E suite, prod checklist.

Each milestone maps 1:1 to an Implementation Workstream (A–K) from PRD Section 29.

---

## 8. Open Decisions Requiring Owner Input

These are flagged, not resolved, per PRD Section 32 and the instruction to surface ambiguity rather than silently choose:

1. **ORM choice** — Prisma (ergonomics) vs. Drizzle (SQL-proximity, better for auditable events).
2. **Database provider** — Neon vs. Supabase vs. Vercel Postgres (affects branching/preview-env story).
3. **Auth provider** — Auth.js (full control) vs. Clerk (faster, less custom, recurring cost — needs approval per guardrails 30).
4. **Background job runner** — Vercel Cron alone vs. Cron + Inngest/QStash for retries and observability.
5. **Custom domains in MVP** — PRD says "desirable but may be deferred" — needs an explicit yes/no before the route/tenant-resolution layer is finalized.
6. **Email provider** — Resend suggested but not approved (32) — needs sign-off before the abstraction is wired to a real provider.

---

## 9. What This Plan Deliberately Excludes (Matches PRD 24.2)

No native payments/checkout, no AI generation, no Zoom OAuth, no SMS/push, no native mobile apps, no public third-party API, no full Community Site embedded integration — only the **integration boundary and contract** are built now. Database migrations are not applied by this plan; schema above is conceptual and requires separate review (per PRD Sections 1 and 30).

---

## 10. Suggested Next Step

Once this plan is reviewed and adjusted, Milestone 1 (Foundation) can get an explicit implementation prompt with acceptance criteria, and the schema in Section 4 can be turned into a reviewable (not applied) migration proposal.
