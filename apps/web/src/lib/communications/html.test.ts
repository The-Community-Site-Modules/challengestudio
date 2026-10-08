/**
 * Message bodies carry text typed by other people — names, titles, creator
 * templates — so they are escaped before becoming HTML.
 */
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/db', () => ({ db: {} }))
const { textToHtml } = await import('./send')

describe('textToHtml', () => {
  it('escapes markup instead of rendering it', () => {
    const html = textToHtml('Hi <a href="https://evil.example">Ada</a> & co')
    expect(html).not.toContain('<a ')
    expect(html).toContain('&lt;a href=&quot;https://evil.example&quot;&gt;Ada&lt;/a&gt; &amp; co')
  })

  it('keeps paragraphs and line breaks', () => {
    expect(textToHtml('one\ntwo\n\nthree')).toBe('<p>one<br/>two</p><p>three</p>')
  })
})
