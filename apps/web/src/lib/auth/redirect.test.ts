/**
 * Redirect targets that arrive from links and forms. Anything that can make
 * a browser leave this site is refused.
 */
import { describe, it, expect } from 'vitest'
import { safeNext } from './redirect'

describe('safeNext', () => {
  it.each([
    '/dashboard',
    '/c/design-sprint/welcome',
    '/auth/invitation/abc?x=1',
  ])('keeps the same-site path %s', (path) => {
    expect(safeNext(path)).toBe(path)
  })

  it.each([
    ['nothing', null],
    ['an empty string', ''],
    ['an absolute URL', 'https://evil.example'],
    ['a userinfo trick', '@evil.example'],
    ['a host suffix trick', '.evil.example'],
    ['a protocol-relative URL', '//evil.example'],
    ['a backslash that browsers read as a slash', '/\\evil.example'],
    ['a backslash later in the path', '/foo\\..\\\\evil.example'],
    ['a tab some parsers strip', '/\t/evil.example'],
    ['a newline', '/\n/evil.example'],
  ])('refuses %s', (_label, value) => {
    expect(safeNext(value)).toBeNull()
  })
})
