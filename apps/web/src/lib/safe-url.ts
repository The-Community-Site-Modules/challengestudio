/**
 * A link target safe to put in an href that someone else will click.
 *
 * Content-block URLs (downloads, join links, offer buttons) are typed by a
 * creator and stored as free JSON — unlike the live-session and offer forms,
 * nothing validated them. React 19 refuses `javascript:` hrefs, but this site's
 * CSP allows inline script, so that one framework guard was the only thing in
 * the way. Allow exactly what a participant link should be: http(s), or a path
 * on this site. Anything else renders as no link.
 */
export function safeHref(url: unknown): string | undefined {
  if (typeof url !== 'string') return undefined
  const value = url.trim()
  if (/^https?:\/\/[^\s]+$/i.test(value)) return value
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) return value
  return undefined
}
