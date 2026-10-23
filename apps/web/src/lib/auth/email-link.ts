/**
 * Reading the link in an auth email.
 *
 * Supabase's default link completes only in the browser that asked for it: it
 * carries a code, and the other half (the PKCE verifier) is a cookie in that
 * browser. People register on a laptop and open the email on their phone, so
 * the link failed for them.
 *
 * The Supabase email templates now link straight here with a token hash
 * instead, which verifies in any browser:
 *
 *   {{ .SiteURL }}/api/auth/callback?token_hash={{ .TokenHash }}&type=email&redirect_to={{ .RedirectTo }}
 *
 * (`type=recovery` in the reset-password template.) `redirect_to` is the URL
 * we gave Supabase — the callback plus our own `next`, `challenge` and `name`.
 * Whether the template engine percent-encodes it or pastes it in raw, those
 * parameters arrive either inside `redirect_to` or beside it, so both places
 * are read. Old links with `?code=` keep working.
 */

import type { EmailOtpType } from '@supabase/supabase-js'

const OTP_TYPES: readonly EmailOtpType[] = ['email', 'magiclink', 'signup', 'recovery', 'invite', 'email_change']

export function isEmailOtpType(value: string | null): value is EmailOtpType {
  return !!value && (OTP_TYPES as readonly string[]).includes(value)
}

/**
 * The callback's own parameters, wherever the email put them. Values beside
 * `redirect_to` win over the same name inside it.
 */
export function linkParams(search: URLSearchParams): URLSearchParams {
  const merged = new URLSearchParams()
  const inner = search.get('redirect_to')
  if (inner) {
    try {
      new URL(inner).searchParams.forEach((value, key) => merged.set(key, value))
    } catch {
      // Not a URL (or Supabase fell back to the bare Site URL) — nothing to add.
    }
  }
  search.forEach((value, key) => {
    if (key !== 'redirect_to') merged.set(key, value)
  })
  return merged
}
