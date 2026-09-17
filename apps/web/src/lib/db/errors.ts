/**
 * Reading Prisma's unique-constraint errors, correctly, in one place.
 *
 * ── Why this file exists ────────────────────────────────────────────────────
 *
 * Three call sites each wrote their own version of "is this a duplicate?", and
 * one of them was wrong in a way nothing caught for weeks.
 *
 * Prisma normally reports the offending field in `meta.target`. Under a driver
 * adapter — this app uses `@prisma/adapter-pg` — it does not. `meta.target` is
 * `undefined`, and the field names live somewhere else entirely:
 *
 *   {
 *     code: 'P2002',
 *     meta: {
 *       modelName: 'Profile',
 *       driverAdapterError: {
 *         cause: {
 *           originalCode: '23505',
 *           kind: 'UniqueConstraintViolation',
 *           constraint: { fields: ['email'] }
 *         }
 *       }
 *     }
 *   }
 *
 * `session.ts` checked `meta.target` and therefore never recognised an email
 * collision. Its recovery path — hand a leftover profile to the person
 * re-registering with that address — was correct, tested by eye, and had never
 * once executed. Signing up with a previously-used address ended on "Something
 * went wrong" instead.
 *
 * The other two call sites only ever checked `code`, which is why points
 * idempotency and the message delivery log were unaffected. That is luck, not
 * design, and it is the reason this is now one function.
 */

/** Prisma's code for a unique constraint violation, whatever the driver. */
const UNIQUE_VIOLATION = 'P2002'

interface PrismaUniqueError {
  code?: string
  meta?: {
    target?: unknown
    driverAdapterError?: {
      cause?: {
        kind?: string
        constraint?: { fields?: unknown }
      }
    }
  }
}

function asPrismaError(error: unknown): PrismaUniqueError | null {
  return typeof error === 'object' && error !== null ? (error as PrismaUniqueError) : null
}

/**
 * Did the database refuse this write because it would duplicate a unique row?
 *
 * Often the answer means the mechanism worked — a second attempt to award the
 * same points, or to send the same message twice — so callers treat it as a
 * result rather than a failure.
 */
export function isUniqueViolation(error: unknown): boolean {
  return asPrismaError(error)?.code === UNIQUE_VIOLATION
}

/**
 * Which column(s) collided, from whichever shape the driver produced.
 *
 * Returns an empty array when the error is not a unique violation, or when the
 * driver told us nothing useful — callers must not read an empty result as
 * "no collision".
 */
export function uniqueViolationFields(error: unknown): string[] {
  const e = asPrismaError(error)
  if (e?.code !== UNIQUE_VIOLATION) return []

  // Driver adapters (@prisma/adapter-pg and friends).
  const adapterFields = e.meta?.driverAdapterError?.cause?.constraint?.fields
  if (Array.isArray(adapterFields)) {
    return adapterFields.filter((f): f is string => typeof f === 'string')
  }

  // Prisma's own engine.
  const target = e.meta?.target
  if (Array.isArray(target)) return target.filter((t): t is string => typeof t === 'string')
  if (typeof target === 'string') return [target]

  return []
}

/** Did the collision involve this specific column? */
export function isUniqueViolationOn(error: unknown, field: string): boolean {
  return uniqueViolationFields(error).includes(field)
}
