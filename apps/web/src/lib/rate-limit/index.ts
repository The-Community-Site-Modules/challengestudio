/**
 * Rate limiting (PRD §22.2, milestone 11).
 *
 * §22.2 asks for limits on public registration and social actions. This was a
 * placeholder that returned `allowed: true` to everything and was wired to
 * nothing, so the requirement was documented rather than met.
 *
 * Two backends, one interface:
 *
 *   Upstash Redis   used when UPSTASH_REDIS_REST_URL and _TOKEN are set. Counts
 *                   are shared across every serverless instance, which is the
 *                   only way a limit means anything in production.
 *   In-process      the fallback. Counts live in one instance's memory, so on
 *                   Vercel a determined caller spread across instances gets
 *                   more than the limit says. It still stops the ordinary
 *                   cases — a stuck retry loop, a form submitted repeatedly,
 *                   someone hammering login in one tab — and it means the call
 *                   sites are wired up and tested before the credentials
 *                   arrive rather than after.
 *
 * The fallback is deliberate, not accidental: refusing to limit at all until
 * Redis exists would leave the call sites unwritten, which is how a limit ends
 * up "added later" and never added.
 */

export type RateLimitAction =
  | 'public_registration'   // Public challenge registration form
  | 'social_post'           // Feed post
  | 'social_comment'        // Comment on a post
  | 'social_reaction'       // Reaction (emoji)
  | 'auth_attempt'          // Login/signup attempts

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
  /** Which backend answered — surfaced so tests and logs can tell. */
  backend: 'redis' | 'memory'
}

/** Sliding window per action. */
export const RATE_LIMITS: Record<RateLimitAction, { requests: number; windowSeconds: number }> = {
  public_registration: { requests: 5,   windowSeconds: 3600 }, // 5 per hour per IP
  social_post:         { requests: 20,  windowSeconds: 3600 }, // 20 per hour per user
  social_comment:      { requests: 50,  windowSeconds: 3600 }, // 50 per hour per user
  social_reaction:     { requests: 100, windowSeconds: 3600 }, // 100 per hour per user
  auth_attempt:        { requests: 10,  windowSeconds: 900  }, // 10 per 15 min per IP
}

// ─── In-process sliding window ───────────────────────────────────────────────

/** action:identifier → timestamps of the hits still inside the window. */
const hits = new Map<string, number[]>()

/**
 * Stop the map growing without bound in a long-lived process. Called on every
 * check, and only does work once a minute.
 */
let lastSweep = 0
function sweep(now: number) {
  if (now - lastSweep < 60_000) return
  lastSweep = now
  const longest = Math.max(...Object.values(RATE_LIMITS).map(l => l.windowSeconds)) * 1000
  for (const [key, times] of hits) {
    const live = times.filter(t => now - t < longest)
    if (live.length === 0) hits.delete(key)
    else hits.set(key, live)
  }
}

function memoryLimit(action: RateLimitAction, identifier: string, now: number): RateLimitResult {
  const { requests, windowSeconds } = RATE_LIMITS[action]
  const windowMs = windowSeconds * 1000
  const key = `${action}:${identifier}`

  sweep(now)

  const times = (hits.get(key) ?? []).filter(t => now - t < windowMs)
  const allowed = times.length < requests
  // A refused attempt is not recorded. Otherwise a caller already over the
  // limit keeps pushing their own window forward and can never get back in.
  if (allowed) times.push(now)
  hits.set(key, times)

  const oldest = times[0] ?? now
  return {
    allowed,
    remaining: Math.max(0, requests - times.length),
    resetAt: new Date(oldest + windowMs),
    backend: 'memory',
  }
}

/** Test seam: forget everything counted so far. */
export function __resetRateLimits() {
  hits.clear()
  lastSweep = 0
}

// ─── Redis ───────────────────────────────────────────────────────────────────

type Limiter = { limit: (id: string) => Promise<{ success: boolean; remaining: number; reset: number }> }
const limiters = new Map<RateLimitAction, Limiter | null>()

/**
 * Build (once) an Upstash limiter for this action, or null if Upstash is not
 * configured or not installed. Imported dynamically so the package stays
 * optional and a missing module degrades to the memory backend rather than
 * breaking the build.
 */
async function redisLimiter(action: RateLimitAction): Promise<Limiter | null> {
  if (limiters.has(action)) return limiters.get(action) ?? null

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    limiters.set(action, null)
    return null
  }

  try {
    const [{ Ratelimit }, { Redis }] = await Promise.all([
      import('@upstash/ratelimit'),
      import('@upstash/redis'),
    ])
    const { requests, windowSeconds } = RATE_LIMITS[action]
    const limiter = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(requests, `${windowSeconds} s`),
      prefix: `cs:rl:${action}`,
      analytics: false,
    }) as unknown as Limiter
    limiters.set(action, limiter)
    return limiter
  } catch {
    // Not installed, or the client could not be constructed. Fall back rather
    // than failing the request the limiter was supposed to protect.
    limiters.set(action, null)
    return null
  }
}

/** Test seam: forget which backend was chosen. */
export function __resetLimiterCache() {
  limiters.clear()
}

/**
 * How long to wait for Redis before giving up and counting in memory.
 *
 * Without this, an unreachable Redis does not degrade the limiter — it stalls
 * every request the limiter is protecting, which is worse than not limiting.
 * A rate-limit check is a side road; it does not get to hold up the journey.
 */
const REDIS_TIMEOUT_MS = 1_000

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('rate-limit: redis timed out')), REDIS_TIMEOUT_MS)
    ),
  ])
}

// ─── The check ───────────────────────────────────────────────────────────────

/**
 * Ask whether this caller may perform this action now.
 *
 * Never throws. If the limiter itself fails, the request is allowed: a broken
 * Redis should not take registration down with it.
 */
export async function checkRateLimit(
  action: RateLimitAction,
  identifier: string,
  now = Date.now()
): Promise<RateLimitResult> {
  const key = identifier?.trim() || 'unknown'

  const limiter = await redisLimiter(action)
  if (limiter) {
    try {
      const r = await withTimeout(limiter.limit(key))
      return {
        allowed: r.success,
        remaining: r.remaining,
        resetAt: new Date(r.reset),
        backend: 'redis',
      }
    } catch {
      // Fall through to memory rather than denying everyone.
    }
  }

  return memoryLimit(action, key, now)
}

/** How long until they may try again, in whole seconds, at least 1. */
export function retryAfterSeconds(result: RateLimitResult, now = Date.now()): number {
  return Math.max(1, Math.ceil((result.resetAt.getTime() - now) / 1000))
}

/** A message safe to show a person: says what happened, not how the limit works. */
export function rateLimitMessage(result: RateLimitResult, now = Date.now()): string {
  const seconds = retryAfterSeconds(result, now)
  if (seconds < 90) return `Too many attempts. Try again in ${seconds} seconds.`
  const minutes = Math.ceil(seconds / 60)
  if (minutes < 90) return `Too many attempts. Try again in ${minutes} minutes.`
  return `Too many attempts. Try again in ${Math.ceil(minutes / 60)} hours.`
}
