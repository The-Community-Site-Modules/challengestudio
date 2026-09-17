# Production readiness checklist

Milestone 11. What has to be true before Challenge Studio serves a real
customer, what is already true, and what is still waiting on someone.

Everything marked **blocked** needs an account, a credential or a decision
that cannot be made from inside the repository.

---

## 1. Deployment

| | Item | State |
|---|---|---|
| ✅ | GitHub repository linked to Vercel | done — pushes trigger deployments |
| ✅ | Root Directory set to `apps/web` | done |
| ☐ | `dev`, `preview` and `production` environments created (PRD §19, §33) | **blocked — owner** |
| ☐ | Preview deployment per branch, so a milestone can be clicked rather than trusted (PRD §29.1) | **blocked — owner** |
| ✅ | Production domain attached, HTTPS verified | `www.mychallengestudio.com` — see the note below |
| ✅ | Build passes from a clean checkout | `pnpm build` |
| ✅ | Cron entry registered for scheduled messages | `vercel.json`, hourly |

**Vercel refuses to deploy a Next.js version with known CVEs.** The build
completes, `/vercel/output` is written, and then the deploy step stops with
"Vulnerable version of Next.js detected". Nothing in the build log explains it,
because nothing in the build was wrong. Keep Next current; the app's auth
gating runs in middleware, which is exactly what CVE-2025-29927 bypassed
before 15.2.3.

**Set the Vercel Root Directory to `apps/web`.** This is the one deploy
setting that cannot be fixed from the repository, and it was the third and last
reason deployments failed. Vercel's Next.js preset looks for `next` in the
Root Directory's `package.json`; at the repo root there is none — correctly,
since Next belongs to the app — so the build ended with *"No Next.js version
detected"*.

With the Root Directory on the app, Vercel's monorepo support handles the rest:
it detects Next.js, installs from the pnpm workspace root, and runs
`next build`. Every override `vercel.json` used to carry was compensating for
the Root Directory being wrong, and they are all gone.

**`vercel.json` lives at `apps/web/vercel.json`**, because Vercel reads it from
the Root Directory. Move the Root Directory and the file has to move with it,
or the cron entry is silently ignored — which would take the scheduled-message
engine down without any error.


**`www` is the canonical host, not the apex.** `mychallengestudio.com`
308-redirects to `www.mychallengestudio.com`. `NEXT_PUBLIC_APP_URL` must be the
host Vercel serves — `https://www.mychallengestudio.com` — because that value
is pasted verbatim into every emailed link and compared verbatim by Supabase
against its redirect allow-list. A link built on the apex survives the redirect
today only because Vercel preserves the query string; it is not something to
depend on for the one link a new user ever clicks.

`NEXT_PUBLIC_APP_URL` is a **build-time** value. Next inlines every
`NEXT_PUBLIC_` variable into the bundle during `next build`, so changing it in
the Vercel dashboard does nothing to the running deployment. Redeploy, or the
old URL stays baked in — and because the symptom is an email that looks fine
and lands on the wrong host, nothing in any log will say so.

**`vercel.json` cannot hold comments.** Its schema rejects unknown top-level
keys, and a rejected config fails the commit with a link to Vercel's
configuration docs rather than to a deployment — there is no deployment to
link to, because none was created. If a status says "Deployment failed" and the
target URL is a docs page, suspect the config file, not the build.

**Note.** `next build` rewrites `apps/web/tsconfig.json` as a side effect
(reformats it, and appends the active `distDir` to `include`). Restore it
after building, or a stray path gets committed:

```
git checkout -- apps/web/tsconfig.json
```

---

## 2. Environment variables

Set in **every** Vercel environment unless noted.

| Variable | Purpose | Consequence if missing |
|---|---|---|
| `DATABASE_URL` | Prisma, via the Supabase transaction pooler | nothing works |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project | auth fails |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase client key | auth fails |
| `NEXT_PUBLIC_APP_URL` | absolute links in email and auth redirects | links point at localhost |
| `CRON_SECRET` | authorises `/api/cron/messages` | **the endpoint refuses every call** — by design, it fails closed |
| `PLATFORM_ADMIN_EMAIL` | comma-separated allow-list for `/admin` | `/admin` denies everyone — also by design |
| `RESEND_API_KEY` | sending email | messages are logged, never sent |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | shared rate-limit counters | limits fall back to per-instance memory, which on serverless is much weaker |

**Set `DIRECT_URL` even where nothing migrates.** It is read during
`pnpm install` — `postinstall` runs `prisma generate`, which loads
`prisma.config.ts`. Until 2026-08-29 that file threw whenever the variable was
absent, so a Vercel project without it died at the *install* step, before Next
started, blaming a Prisma config file. Every deployment of this repository
failed that way. The check is now scoped to the commands that actually open a
connection, and a production build succeeds with no environment at all — but
the app still needs these values to serve a request.

Two of these fail **closed** on purpose. An unset `CRON_SECRET` or
`PLATFORM_ADMIN_EMAIL` denies everyone rather than letting everyone through;
if either area appears broken in production, check the variable first.

---

## 3. Security

| | Item | Where |
|---|---|---|
| ✅ | Capability-based authorisation, never role-name checks | `lib/permissions` |
| ✅ | Cross-tenant isolation on the workspace actions | `(workspace)/tenant-isolation.test.ts` |
| ✅ | Cross-tenant isolation on the challenge, step and block actions | `challenges/cross-tenant.test.ts` |
| ✅ | Cross-tenant isolation through the browser | `e2e/isolation.spec.ts` |
| ✅ | Private submissions withheld on the server, not hidden in the page | `e2e/permissions.spec.ts` |
| ✅ | Export permission-checked, audit-logged, and carries no submission bodies | `lib/analytics/export.ts` |
| ✅ | Rate limits on registration, social actions and auth attempts (PRD §22.2) | `lib/rate-limit` |
| ✅ | Security headers and a Content-Security-Policy | `next.config.ts`, `middleware.ts` |
| ✅ | Open-redirect guard on `next=` parameters | `safeNext` in the auth actions |
| ✅ | Reserved slugs blocked at workspace and challenge creation | `lib/slugs/reserved.ts` |
| ☐ | Dependency audit in CI (`pnpm audit`) | **not done** |

### Why the CSP has no nonce

A nonce-based policy was written first, and a production build showed it could
not work: ten routes are statically prerendered, so their HTML is generated at
build time and can never carry a per-request nonce. With `'strict-dynamic'` the
browser refused every script on those pages and they silently failed to
hydrate — a login form that renders and does nothing. Development mode hid it.

The policy therefore allows `'unsafe-inline'` for scripts and keeps
`object-src`, `base-uri`, `form-action` and `frame-ancestors` strict. If a
nonce is wanted later, every page must first be made dynamic, and
`e2e/headers.spec.ts` is the test that will tell you whether it worked.

### The RLS boundary — read this before changing database policy

Prisma connects as the **table owner**, and Postgres exempts table owners from
row-level security. RLS therefore protects the PostgREST surface Supabase
exposes; it protects **nothing** the application itself queries.

Every isolation guarantee in this product is application code. That is why the
tests above exist, and why `FORCE ROW LEVEL SECURITY` must not be enabled here
— it would break every query the app makes without adding a defence, since the
app is the thing being defended against in that model.

---

## 4. Data

| | Item |
|---|---|
| ✅ | Migrations are raw `.sql`, applied deliberately rather than by an auto-sync |
| ✅ | Append-only event tables; progress derived, never mutated (Build Plan §4 rule 2) |
| ✅ | Dates stored in UTC, challenge timezone applied at read time (rule 3) |
| ✅ | Idempotency enforced by unique constraints, not by application checks |
| ☐ | Automated backup schedule confirmed in the Supabase dashboard | **blocked — owner** |
| ☐ | A restore actually rehearsed once | **blocked — owner** |

A backup nobody has restored is a belief, not a backup. Worth one afternoon
before the first paying customer.

---

## 5. Email

| | Item | State |
|---|---|---|
| ✅ | Resend API key set | done |
| ✅ | Sending domain verified in Resend | `mychallengestudio.com` |
| ✅ | Supabase SMTP configured, so auth mail sends from the product domain | |
| ☐ | **Email confirmation enabled in Supabase** (`mailer_autoconfirm: false`) | **currently off — see below** |
| ☐ | `EMAIL_FROM_ADDRESS` / `EMAIL_FROM_NAME` on the verified domain | |
| ☐ | One real send proven to an address that is **not** the Resend account owner | |
| ◐ | SPF and DKIM published (Resend requires them to verify); DMARC not confirmed | |
| ✅ | Delivery log with per-recipient idempotency keys | `message_deliveries` |
| ✅ | Unsubscribe honoured per workspace | `lib/communications` |
| ✅ | Failures and skips both recorded, not only successes | |

**The trap.** Resend accepts an API key without a verified domain and then
silently refuses to deliver to anyone but the account owner. A test that
"works" for you and reaches nobody else is the usual first symptom. Verify the
domain before believing any send.

**Supabase is not sending confirmation emails at all right now.** Its public
settings endpoint reports `"mailer_autoconfirm": true`, which means a new
account is marked confirmed the moment it is created and no confirm-signup mail
is generated. Nothing in the app can tell the difference: sign-up succeeds, the
person is logged straight in, and the flow looks healthier than it is.

Two consequences, and the second is the one that matters:

1. The confirmation-link fix (commit `1126524`, which pointed
   `emailRedirectTo` at `/api/auth/callback`) is currently dead code. It is
   still correct and still pinned by `redirects.test.ts`; it simply never runs.
2. **Nobody proves they own the address they signed up with.** For a product
   whose whole job is emailing participants on a schedule, that means typo'd
   and borrowed addresses enter the send list, bounce, and spend the sending
   reputation of a domain verified only days ago. A new domain has no
   reputation to absorb that.

Turn "Confirm email" back on under Authentication → Sign In / Providers →
Email, then confirm the setting rather than trusting the toggle:

```
curl -s https://<project>.supabase.co/auth/v1/settings | grep autoconfirm
```

That endpoint is public and unauthenticated, which makes it the cheapest way to
verify an auth setting without opening the dashboard — and the only way to
check it from CI.

---

## 6. Observability

| | Item |
|---|---|
| ☐ | Sentry DSN configured (the package is installed, unwired) | **not done** |
| ☐ | Uptime check against `/api/health` | **not done** |
| ✅ | Health endpoint that touches the database | `/api/health` |
| ✅ | Cron sweep reports what it sent, skipped and failed |

---

## 7. Accessibility

| | Item |
|---|---|
| ✅ | axe-core over public, participant and creator pages, at serious and critical | `e2e/accessibility.spec.ts` |
| ✅ | Keyboard reachability and a visible focus ring on interactive controls |
| ☐ | Screen-reader pass by a person | **not done — needs a human** |

---

## 9. Legal

| | Item | State |
|---|---|---|
| ✅ | Privacy Policy written from the schema, not a template | `/legal/privacy` |
| ✅ | Terms of Service matching a product with no billing | `/legal/terms` |
| ☐ | **Both reviewed by a lawyer** | **not done** |
| ◐ | `contactEmail` and `privacyEmail` now on `mychallengestudio.com`; **the two inboxes must exist** | `legal/_components/config.ts` |
| ☐ | `jurisdiction` confirmed — the state the LLC is registered in | same file |

Everything else on those pages was read out of the code: what the schema
stores, which cookie the middleware sets, the Supabase region in
`DATABASE_URL`, and the fact that `next/font/google` self-hosts Inter so no
visitor data reaches a font network.

**That is also the risk.** The policy is accurate today because it describes
this codebase. The moment file uploads land, or an analytics script is added,
or a provider changes, it is wrong until someone edits it. Treat
`/legal/privacy` as a file that ships with the feature, not as a document
written once.

Automated checks catch roughly a third of what matters. They do not tell you
whether the page makes sense read aloud.

---

## 8. Before flipping the switch

1. Run `pnpm test` and `pnpm --filter @challenge-studio/web test:e2e` against
   the preview deployment, not only locally.
2. Create a challenge, register as a stranger, complete a day, and check the
   creator's analytics reflect it — the whole product in one pass.
3. Confirm the cron endpoint refuses an unauthenticated call in production.
4. Send one real email to an address outside the sending domain.
5. Restore the database backup into a scratch project.
