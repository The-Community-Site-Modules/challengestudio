# OD-06: ORM

**Status:** ✅ Decided — Prisma (recorded retrospectively 2026-08-29)
**Plan reference:** §2, §8 item 1

## The question

Prisma (ergonomics on a large schema) or Drizzle (closer to SQL, which the
plan argued suits auditable points and progress queries).

## Decided: Prisma 7, with `@prisma/adapter-pg`

The schema reached 21 models. Prisma's generated types across that many
relations are what keeps cross-domain mistakes at compile time, which is the
reason the plan gave for TypeScript being non-negotiable in the first place.

The plan's argument for Drizzle was auditable event queries. That concern
turned out to be handled by schema design rather than by the query layer:
`points_events` is append-only with a unique idempotency key, so
double-awarding is refused by Postgres, not by careful SQL.

## Consequences

- Connects through the Supabase **transaction pooler**, so `DATABASE_URL` and
  `DIRECT_URL` differ; migrations need the direct connection.
- Prisma connects as the table owner and is therefore **exempt from row-level
  security**. Application-level scoping is the only tenant isolation for
  anything the app queries. See `plan-conformance.md` §3 and
  `production-checklist.md`.
- Migrations are raw `.sql` applied deliberately, not by `prisma migrate dev`
  against production.
