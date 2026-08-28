/**
 * Reserved slugs (milestone 11).
 *
 * The list is only worth having if it is complete in the way that matters, so
 * these tests assert the two categories rather than spot-checking entries:
 * every top-level route this app serves, and the names that would let a
 * customer's page pass for the product's own.
 */

import { describe, it, expect } from 'vitest'
import { checkSlug, avoidReserved, RESERVED_SLUGS } from './reserved'

describe('names the product needs', () => {
  // Every top-level segment under src/app that is not a route group.
  const ROUTES = ['account', 'admin', 'api', 'auth', 'c', 'dashboard', 'ws']

  for (const route of ROUTES) {
    it(`refuses "${route}", which is a route`, () => {
      expect(checkSlug(route).ok).toBe(false)
    })
  }
})

describe('names that would pass for the product', () => {
  for (const name of ['support', 'billing', 'security', 'official', 'legal']) {
    it(`refuses "${name}"`, () => {
      expect(checkSlug(name).ok).toBe(false)
    })
  }

  it('does not explain which names are interesting', () => {
    // "Reserved" invites "by whom", and a list of interesting names is a map.
    const message = checkSlug('admin').error ?? ''
    expect(message.toLowerCase()).not.toContain('reserved')
    expect(message.toLowerCase()).not.toContain('system')
  })
})

describe('shapes that are not names', () => {
  it('refuses a single character', () => {
    expect(checkSlug('a').ok).toBe(false)
  })

  it('refuses digits alone, which read as an id', () => {
    expect(checkSlug('42').ok).toBe(false)
    expect(checkSlug('0').ok).toBe(false)
  })

  it('allows digits alongside letters', () => {
    expect(checkSlug('30-day-sprint').ok).toBe(true)
  })
})

describe('ordinary names', () => {
  for (const name of ['designify', 'acme-coaching', '30-day-design-sprint', 'my-team']) {
    it(`allows "${name}"`, () => {
      expect(checkSlug(name).ok).toBe(true)
    })
  }

  it('is not case-sensitive about the ones it refuses', () => {
    expect(checkSlug('Admin').ok).toBe(false)
    expect(checkSlug('  ADMIN  ').ok).toBe(false)
  })

  it('does not refuse a name that merely contains a reserved word', () => {
    // "admin" is taken; "admin-training" is somebody's challenge.
    expect(checkSlug('admin-training').ok).toBe(true)
    expect(checkSlug('support-group').ok).toBe(true)
  })
})

describe('nudging aside rather than refusing', () => {
  it('leaves an available slug alone', () => {
    expect(avoidReserved('design-sprint')).toBe('design-sprint')
  })

  it('moves a taken one out of the way', () => {
    expect(avoidReserved('support')).toBe('support-2')
  })

  it('produces something that is itself available', () => {
    for (const slug of RESERVED_SLUGS) {
      expect(checkSlug(avoidReserved(slug)).ok, slug).toBe(true)
    }
  })
})
