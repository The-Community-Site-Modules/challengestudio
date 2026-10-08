/**
 * A redirect target that can only ever be a path on this site.
 *
 * Shared by the auth actions and the auth callback. The callback used to
 * redirect to `${origin}${next}` with `next` taken straight off the query
 * string, so `?next=@evil.example` produced `https://app@evil.example` — a
 * URL whose host is evil.example. That is an open redirect on the one link
 * people are trained to trust: the one in their sign-in email.
 *
 * Rules: starts with a single `/`; never `//`; no backslash anywhere (browsers
 * read `/\evil.example` as `//evil.example`); no control characters, which some
 * parsers strip to turn `/\t/evil.example` into `//evil.example`.
 */
export function safeNext(value: string | null | undefined): string | null {
  if (!value) return null
  if (!value.startsWith('/')) return null
  if (value.startsWith('//')) return null
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return null
  return value
}
