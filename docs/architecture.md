# Challenge Studio — Architecture Overview

> Living document. Update as decisions are made and milestones complete.

## Stack

| Concern | Choice | Version |
|---|---|---|
| Framework | Next.js (App Router) | 15.1.6 |
| Language | TypeScript | 5.7.2 |
| Database | PostgreSQL via **Supabase** | OD-1: ✅ decided |
| ORM | **Prisma** (`@prisma/adapter-pg` over the Supabase pooler) | 7.9.1 |
| Auth | **Supabase Auth** (`@supabase/ssr`) | 0.12.4 |
| Git repository | GitHub — `The-Community-Site-Modules/challengestudio` | OD-5: ✅ decided |
| File Storage | Cloudflare R2 | OD-2: pending |
| Email | Resend (abstracted) | OD-3: pending |
| Background Jobs | Inngest | OD-4: pending |
| Rate Limiting | Upstash Redis | — |
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
| OD-3 | Email provider (Resend) | Pending |
| OD-4 | Background jobs (Inngest) | Pending |
| OD-5 | Git repository location | ✅ GitHub (see decisions/OD-05) |
| OD-6 | Challenge slug namespace (global vs workspace-scoped) | Pending |
| OD-7 | Participant auth (magic link / password / both) | Pending |

## Milestone Progress

| # | Milestone | Status |
|---|---|---|
| 1 | Foundation | ✅ Structure created |
| 2 | Identity & Tenancy | 🔲 Not started |
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
