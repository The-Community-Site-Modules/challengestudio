# OD-08: Custom domains in the MVP

**Status:** ❌ Open — needs an explicit yes or no from the owner
**Plan reference:** §8 item 5 — "PRD indicates desirable but may be deferred"

## The question

Should a workspace be able to serve its challenges from its own domain
(`challenges.acme.com`) in the first release?

## Where it stands

Not built, and nothing in the codebase assumes it either way. The `/pricing`
comparison table currently lists **Custom domain** as unavailable on all three
plans, which is accurate today and is the only place a visitor is told.

## What a yes would cost

- Domain registration and verification flow per workspace (DNS TXT check).
- Certificate issuance — Vercel handles this, but only once the deploy
  pipeline exists, so this is blocked behind Milestone 1 regardless.
- Middleware routing on `Host`, plus reserved-domain protection alongside the
  existing reserved-slug rules in `lib/slugs/reserved.ts`.
- The registration page, hub, feed and offer pages all generate absolute URLs
  from `NEXT_PUBLIC_APP_URL`; each would need to resolve per workspace.

Roughly a milestone's work, and it cannot start before Vercel is connected.

## Recommendation: defer, and say so on the pricing page

The product is pre-launch with no customers asking for it, and every hour
spent here is an hour not spent on the deploy pipeline that everything else
is waiting behind. Deferring costs nothing that cannot be added later —
workspace slugs stay stable either way.

**Owner: yes or no.** A "no" closes this file; a "yes" makes it a milestone
after deployment.
