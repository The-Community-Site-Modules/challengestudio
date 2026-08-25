# OD-01: Database Provider

**Status:** Pending owner decision
**Blocking:** Milestone 2

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
