/**
 * Rate limiting (PRD §22.2, milestone 11).
 *
 * This module used to return `allowed: true` to everything, so a test here is
 * only worth writing if it can fail. Each one below drives the limiter past
 * its budget and asserts the refusal — including the case that makes a naive
 * sliding window useless: a caller already over the limit must not be able to
 * push their own window forward by keeping on trying.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  checkRateLimit, RATE_LIMITS, retryAfterSeconds, rateLimitMessage,
  __resetRateLimits, __resetLimiterCache,
} from './index'

const T0 = new Date('2026-03-01T12:00:00Z').getTime()

beforeEach(() => {
  __resetRateLimits()
  __resetLimiterCache()
  delete process.env.UPSTASH_REDIS_REST_URL
  delete process.env.UPSTASH_REDIS_REST_TOKEN
})
afterEach(() => { vi.unstubAllEnvs() })

describe('the budget', () => {
  it('allows exactly the configured number of attempts', async () => {
    const { requests } = RATE_LIMITS.public_registration
    for (let i = 0; i < requests; i++) {
      const r = await checkRateLimit('public_registration', '1.2.3.4', T0)
      expect(r.allowed, `attempt ${i + 1}`).toBe(true)
    }
    expect((await checkRateLimit('public_registration', '1.2.3.4', T0)).allowed).toBe(false)
  })

  it('counts down what is left', async () => {
    const first = await checkRateLimit('public_registration', 'ip', T0)
    expect(first.remaining).toBe(RATE_LIMITS.public_registration.requests - 1)
  })

  it('keeps callers apart', async () => {
    const { requests } = RATE_LIMITS.public_registration
    for (let i = 0; i < requests; i++) await checkRateLimit('public_registration', 'first', T0)
    expect((await checkRateLimit('public_registration', 'first', T0)).allowed).toBe(false)
    expect((await checkRateLimit('public_registration', 'second', T0)).allowed).toBe(true)
  })

  it('keeps actions apart', async () => {
    const { requests } = RATE_LIMITS.public_registration
    for (let i = 0; i < requests; i++) await checkRateLimit('public_registration', 'ip', T0)
    expect((await checkRateLimit('public_registration', 'ip', T0)).allowed).toBe(false)
    expect((await checkRateLimit('auth_attempt', 'ip', T0)).allowed).toBe(true)
  })
})

describe('the window slides', () => {
  it('lets a caller back in once the window has passed', async () => {
    const { requests, windowSeconds } = RATE_LIMITS.auth_attempt
    for (let i = 0; i < requests; i++) await checkRateLimit('auth_attempt', 'ip', T0)
    expect((await checkRateLimit('auth_attempt', 'ip', T0)).allowed).toBe(false)

    const later = T0 + windowSeconds * 1000 + 1
    expect((await checkRateLimit('auth_attempt', 'ip', later)).allowed).toBe(true)
  })

  it('does not let a blocked caller extend their own window by retrying', async () => {
    // The bug this guards: recording refused attempts too. A caller who keeps
    // trying would keep the window full and never be let back in.
    const { requests, windowSeconds } = RATE_LIMITS.auth_attempt
    for (let i = 0; i < requests; i++) await checkRateLimit('auth_attempt', 'ip', T0)

    // Hammering throughout the window.
    for (let t = T0; t < T0 + windowSeconds * 1000; t += 60_000) {
      await checkRateLimit('auth_attempt', 'ip', t)
    }

    const justAfter = T0 + windowSeconds * 1000 + 1
    expect((await checkRateLimit('auth_attempt', 'ip', justAfter)).allowed).toBe(true)
  })

  it('frees one slot at a time, not the whole budget at once', async () => {
    const { requests, windowSeconds } = RATE_LIMITS.auth_attempt
    // Spread the attempts a minute apart.
    for (let i = 0; i < requests; i++) await checkRateLimit('auth_attempt', 'ip', T0 + i * 60_000)
    // Just past the first one's expiry: one slot back, and only one.
    const t = T0 + windowSeconds * 1000 + 1
    expect((await checkRateLimit('auth_attempt', 'ip', t)).allowed).toBe(true)
    expect((await checkRateLimit('auth_attempt', 'ip', t)).allowed).toBe(false)
  })
})

describe('identifying the caller', () => {
  it('buckets an unidentifiable caller rather than exempting them', async () => {
    const { requests } = RATE_LIMITS.public_registration
    for (let i = 0; i < requests; i++) await checkRateLimit('public_registration', '', T0)
    expect((await checkRateLimit('public_registration', '   ', T0)).allowed).toBe(false)
  })
})

describe('what the caller is told', () => {
  it('reports when they may try again', async () => {
    const r = await checkRateLimit('auth_attempt', 'ip', T0)
    expect(retryAfterSeconds(r, T0)).toBe(RATE_LIMITS.auth_attempt.windowSeconds)
  })

  it('never says zero seconds', async () => {
    const r = await checkRateLimit('auth_attempt', 'ip', T0)
    expect(retryAfterSeconds(r, r.resetAt.getTime() + 5_000)).toBe(1)
  })

  it('phrases the wait in a readable unit', async () => {
    const r = await checkRateLimit('auth_attempt', 'ip', T0)
    expect(rateLimitMessage(r, r.resetAt.getTime() - 30_000)).toContain('30 seconds')
    expect(rateLimitMessage(r, r.resetAt.getTime() - 600_000)).toContain('10 minutes')
    expect(rateLimitMessage(r, r.resetAt.getTime() - 7_200_000)).toContain('2 hours')
  })

  it('does not describe the limit itself', async () => {
    // A message naming the budget tells an attacker exactly what to stay under.
    const r = await checkRateLimit('auth_attempt', 'ip', T0)
    const message = rateLimitMessage(r, T0)
    expect(message).not.toContain(String(RATE_LIMITS.auth_attempt.requests))
  })
})

describe('choosing a backend', () => {
  it('uses memory when Upstash is not configured', async () => {
    expect((await checkRateLimit('social_post', 'p1', T0)).backend).toBe('memory')
  })

  it('falls back to memory quickly when Redis cannot be reached', async () => {
    // Credentials present, host unreachable. The request must still be
    // answered, and answered promptly: a limiter that hangs takes down the
    // very thing it was protecting. Allow generously more than the internal
    // timeout so the assertion is about the timeout existing, not its exact
    // value.
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://10.255.255.1')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'nonsense')
    __resetLimiterCache()

    const started = Date.now()
    const r = await checkRateLimit('social_post', 'p1', T0)
    expect(r.backend).toBe('memory')
    expect(r.allowed).toBe(true)
    expect(Date.now() - started).toBeLessThan(4_000)
  }, 10_000)
})
