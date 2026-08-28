# OD-04: Background Job System

**Status:** ✅ Decided by default — **Vercel Cron alone**, no queue.
Recorded retrospectively 2026-08-29.

> **What shipped.** One hourly cron entry in `vercel.json` hitting
> `/api/cron/messages`, which refuses without `CRON_SECRET`. The Inngest
> handler this repo once carried was a 501 stub that nothing called; it was
> deleted on 2026-08-29 rather than left to look like a second job system.
>
> **What the plan wanted a queue for, and what replaces it:** retries and
> observability. Retries are unnecessary because delivery is idempotent at the
> database level — `message_deliveries.idempotency_key` is unique, so a
> re-run of a missed hour sends exactly what was missed and nothing twice.
> Observability is the delivery log itself, which records skips and failures
> alongside sends.
>
> **What is genuinely weaker:** a cron tick that never fires is only noticed
> at the next tick, and the sweep must finish inside Vercel's 60-second limit
> — it was measured at 88s once and reduced to 23s by batching. If sends grow
> past that, a queue becomes necessary rather than optional.
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
