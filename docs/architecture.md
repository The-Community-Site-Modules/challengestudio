# Challenge Studio — Architecture Overview

> Living document. Update as decisions are made and milestones complete.
>
> Where the built product differs from
> [the technical build plan](plan/technical-build-plan.md), the differences are
> recorded in [plan-conformance.md](plan-conformance.md) — checked
> 2026-08-29, after Milestone 11.

## Stack

| Concern | Choice | Version |
|---|---|---|
| Framework | Next.js (App Router) | 15.1.6 |
| Language | TypeScript | 5.7.2 |
| Database | PostgreSQL via **Supabase** | [OD-01](decisions/OD-01-database.md): ✅ |
| ORM | **Prisma** (`@prisma/adapter-pg` over the Supabase pooler) | [OD-06](decisions/OD-06-orm.md): ✅ 7.9.1 |
| Auth | **Supabase Auth** (`@supabase/ssr`) — not one of the plan's two options | [OD-07](decisions/OD-07-auth.md): ⚠️ |
| Git repository | GitHub — `The-Community-Site-Modules/challengestudio` | OD-5: ✅ decided |
| File Storage | not built — `lib/storage` throws | [OD-02](decisions/OD-02-storage.md): ⛔ open |
| Email | Resend, behind an abstraction; no API key yet | [OD-03](decisions/OD-03-email.md): 🟡 |
| Background Jobs | **Vercel Cron alone** — the Inngest stub was removed | [OD-04](decisions/OD-04-jobs.md): ✅ |
| Rate Limiting | Upstash when configured, in-process otherwise | ✅ |
| UI | shadcn/ui + Tailwind CSS | — |
| Hosting | Vercel | — |

## Monorepo Structure

```
challenge-studio/
├── apps/web/           Next.js application
├── packages/db/        Drizzle schema + migrations
├── packages/types/     Shared TypeScript types
├── packages/validators/ Zod validation schemas
└── docs/               Architecture, env, decisions
```

## Owner Decisions (Open)

| ID | Decision | Status |
|---|---|---|
| OD-1 | Database provider | ✅ Supabase |
| OD-2 | File storage (Cloudflare R2) | Pending |
| OD-3 | Email provider (Resend) | ✅ Resend — driver built, awaiting API key |
| OD-4 | Background jobs (Inngest) | Pending |
| OD-5 | Git repository location | ✅ GitHub (see decisions/OD-05) |
| OD-6 | Challenge slug namespace (global vs workspace-scoped) | Pending |
| OD-7 | Participant auth (magic link / password / both) | Pending |

## Platform admin

`/admin` spans every tenant, so no workspace role can grant it. Access is an
allow-list of email addresses in `PLATFORM_ADMIN_EMAIL` (comma-separated),
checked in middleware and again in the admin layout. **An unset variable denies
everyone** — the allow-list fails closed, so each environment has to set it
separately. Currently `salman@actionera.com` in local development.

## Milestone Progress

| # | Milestone | Status |
|---|---|---|
| 1 | Foundation | ✅ Structure created |
| 2 | Identity & Tenancy | ✅ Complete |
| 3 | Workspace & Branding | 🔲 Not started |
| 4 | Challenge Domain | 🔲 Not started |
| 5 | Builder | 🔲 Not started |
| 6 | Publishing | 🔲 Not started |
| 7 | Public Funnel | 🔲 Not started |
| 8 | Enrollment & Scheduling | 🔲 Not started |
| 9 | Participant Experience | 🔲 Not started |
| 10 | Community | 🔲 Not started |
| 11 | Gamification | 🔲 Not started |
| 12 | Live Sessions | 🔲 Not started |
| 13 | Communications | 🔲 Not started |
| 14 | Analytics | 🔲 Not started |
| 15 | Security & Integration | 🔲 Not started |
