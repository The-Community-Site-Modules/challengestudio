# OD-04: Background Job System

**Status:** Pending owner decision
**Blocking:** Milestone 8 (scheduling) + Milestone 13 (email triggers)

## Recommendation: Inngest

**Why Inngest:**
- Serverless-compatible — no persistent worker to manage on Vercel
- Durable functions with automatic retry + observability dashboard
- Event-driven model fits the challenge domain (step unlock, inactivity nudge)
- Local dev server available (`npx inngest-cli@latest dev`)

**Alternatives:**
| Provider | Pros | Cons |
|---|---|---|
| Inngest | Serverless, durable, great DX | SaaS cost at scale |
| Trigger.dev | Open-source option | Self-host or cloud |
| Vercel Cron | Zero setup | Limited to cron schedule, no event-driven |
| QStash (Upstash) | Already using Upstash for rate limit | More manual retry logic |

## Action required
Reply with: **Inngest** or specify alternative.
Once confirmed, provide: Event Key, Signing Key from Inngest dashboard.
