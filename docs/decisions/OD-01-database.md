# OD-01: Database Provider

**Status:** ✅ Decided — **Supabase**, not the Neon recommended below.
Recorded retrospectively 2026-08-29.

> **What actually shipped.** The recommendation on this page was Neon; the
> product runs on Supabase. Supabase was chosen because auth came with it
> (see [OD-07](OD-07-auth.md)) — one vendor, and `auth.users.id` as a real
> foreign key on `profiles` rather than an id kept in sync across two systems.
> The branching-per-preview story that made Neon attractive is unused, because
> the preview environments it depends on do not exist yet.
>
> Consequence worth knowing: Prisma connects through the Supabase transaction
> pooler as the table owner, so it is **exempt from row-level security**.
> Application-level scoping is the only tenant isolation. See
> [../plan-conformance.md](../plan-conformance.md).

The original recommendation is kept below unedited, because a decision record
that is rewritten to match the outcome cannot tell you anything.

---

## Decision needed
Which PostgreSQL provider should we use?

## Recommendation: Neon

**Why Neon:**
- Serverless Postgres — scales to zero in dev, no idle costs
- Branch per preview environment — each Vercel preview gets its own DB branch
- Compatible with Drizzle ORM + `@neondatabase/serverless` driver
- Vercel integration available for automatic env var management

**Alternatives:**
| Provider | Pros | Cons |
|---|---|---|
| Neon | Branching, serverless, Vercel-native | Newer provider |
| Supabase | Postgres + auth + storage in one | More opinions in the stack |
| PlanetScale | Reliable, fast | MySQL only — requires schema adjustments |
| AWS RDS | Enterprise standard | No free tier, more infra management |

## Action required
Reply with: **Neon** or specify alternative.
Once confirmed, provide connection strings for dev + preview + production.
