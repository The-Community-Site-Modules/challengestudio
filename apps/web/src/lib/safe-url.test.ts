import { describe, it, expect } from 'vitest'
import { safeHref } from './safe-url'

describe('safeHref', () => {
  it.each([
    'https://zoom.us/j/123',
    'http://example.com/file.pdf',
    '/c/sprint/offer',
  ])('keeps %s', (url) => {
    expect(safeHref(url)).toBe(url)
  })

  it.each([
    'javascript:alert(1)',
    ' JavaScript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox',
    '//evil.example',
    '/\\evil.example',
    'https://has space.example',
    '',
    undefined,
    42,
  ])('refuses %j', (url) => {
    expect(safeHref(url)).toBeUndefined()
  })
})
