/**
 * Reading Prisma's unique-constraint errors.
 *
 * These tests exist because the thing they test was wrong in production, and
 * the reason it was wrong is that nobody had looked at the error object the
 * app actually receives. So both fixtures below are **copied from real errors**
 * — the adapter one was captured by deliberately colliding on
 * `profiles.email` through this app's own client against the live database.
 *
 * A hand-written `{ code: 'P2002', meta: { target: ['email'] } }` would pass
 * every test here and tell you nothing, which is exactly what happened.
 */

import { describe, it, expect } from 'vitest'
import { isUniqueViolation, uniqueViolationFields, isUniqueViolationOn } from './errors'

/**
 * Captured from `@prisma/adapter-pg`, which is what this app runs. Note what
 * is missing: `meta.target`.
 */
const ADAPTER_ERROR = {
  code: 'P2002',
  meta: {
    modelName: 'Profile',
    driverAdapterError: {
      name: 'DriverAdapterError',
      cause: {
        originalCode: '23505',
        originalMessage: 'duplicate key value violates unique constraint "profiles_email_key"',
        kind: 'UniqueConstraintViolation',
        constraint: { fields: ['email'] },
      },
    },
  },
}

/** The shape Prisma's own engine produces, without a driver adapter. */
const ENGINE_ERROR = {
  code: 'P2002',
  meta: { target: ['email'] },
}

/** Older Prisma versions reported a bare string. */
const LEGACY_ERROR = {
  code: 'P2002',
  meta: { target: 'email' },
}

describe('recognising a duplicate at all', () => {
  it('recognises the adapter shape', () => {
    expect(isUniqueViolation(ADAPTER_ERROR)).toBe(true)
  })

  it('recognises the engine shape', () => {
    expect(isUniqueViolation(ENGINE_ERROR)).toBe(true)
  })

  it('is not fooled by another Prisma error', () => {
    expect(isUniqueViolation({ code: 'P2025', meta: {} })).toBe(false)
  })

  it('survives being handed something that is not an error object', () => {
    for (const value of [null, undefined, 'P2002', 42, []]) {
      expect(isUniqueViolation(value)).toBe(false)
    }
  })
})

describe('finding which column collided', () => {
  it('reads the adapter shape — the case that was broken', () => {
    // meta.target is undefined here. Checking it, as the old code did, meant
    // an email collision was never recognised and the account-recovery path
    // never ran once.
    expect(ADAPTER_ERROR.meta).not.toHaveProperty('target')
    expect(uniqueViolationFields(ADAPTER_ERROR)).toEqual(['email'])
  })

  it('reads the engine shape', () => {
    expect(uniqueViolationFields(ENGINE_ERROR)).toEqual(['email'])
  })

  it('reads the legacy string shape', () => {
    expect(uniqueViolationFields(LEGACY_ERROR)).toEqual(['email'])
  })

  it('reports nothing for an error that is not a duplicate', () => {
    expect(uniqueViolationFields({ code: 'P2025', meta: { target: ['email'] } })).toEqual([])
  })

  it('reports nothing rather than guessing when the driver says nothing', () => {
    expect(uniqueViolationFields({ code: 'P2002', meta: {} })).toEqual([])
  })

  it('handles a composite constraint', () => {
    const composite = {
      code: 'P2002',
      meta: {
        driverAdapterError: {
          cause: { kind: 'UniqueConstraintViolation', constraint: { fields: ['participantId', 'stepId'] } },
        },
      },
    }
    expect(uniqueViolationFields(composite)).toEqual(['participantId', 'stepId'])
  })
})

describe('asking about one specific column', () => {
  it('answers yes for the adapter shape', () => {
    expect(isUniqueViolationOn(ADAPTER_ERROR, 'email')).toBe(true)
  })

  it('answers yes for the engine shape', () => {
    expect(isUniqueViolationOn(ENGINE_ERROR, 'email')).toBe(true)
  })

  it('answers no for a column that did not collide', () => {
    expect(isUniqueViolationOn(ADAPTER_ERROR, 'idempotency_key')).toBe(false)
  })

  it('answers no when the driver named no columns', () => {
    // Deliberate: an unknown collision must not be treated as the one the
    // caller was hoping for. session.ts rethrows in that case, which is right.
    expect(isUniqueViolationOn({ code: 'P2002', meta: {} }, 'email')).toBe(false)
  })
})
