# OD-05: Git Repository Location

**Status:** ✅ Decided — 2026-08-25
**Was blocking:** Milestone 1 (Foundation)

## Decision

GitHub, under the `The-Community-Site-Modules` organisation.

| Field | Value |
|---|---|
| Remote URL | `https://github.com/The-Community-Site-Modules/challengestudio.git` |
| Owner account | `Salman2497` |
| Commit email | `salman@actionera.com` |
| Default branch | `main` |

## Why this unblocked more than itself

Three separate Milestone 1 deliverables were waiting on this one answer:

```
OD-05 (repo location)
  └─→ git init + push
        ├─→ GitHub Actions (CI)
        └─→ Vercel git integration
              └─→ preview deployment per branch  (Build Plan §7, PRD 29.1)
```

Without a remote there was no CI to run and nothing for Vercel to watch, so
"every milestone ends in a clickable preview deployment" was impossible.

## Follow-up actions

- [x] `git init` with `main` as the default branch
- [x] CI workflow at `.github/workflows/ci.yml` (lint → type-check → build)
- [ ] Push initial commit to the remote
- [ ] Connect the repo to Vercel and confirm a preview deploy
- [ ] Create separate dev / preview / production environments in Vercel

## Note on secrets

`.env.example` contained a **real** Supabase database password before this
commit. It was replaced with placeholders. The credential was never pushed
anywhere — no git history existed at the time — so no rotation was required.
Real values live only in `apps/web/.env.local`, which `.gitignore` excludes.
