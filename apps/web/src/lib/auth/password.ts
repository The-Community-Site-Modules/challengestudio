/**
 * Whether someone who signed in by email link knows a password for it.
 *
 * Everyone who registers for a challenge arrives by magic link and never sets
 * a password. That works until the day they open the link on a different
 * device — the link only completes in the browser that asked for it — and land
 * on a sign-in page asking for a password they never had. Offering to create
 * one straight after a link sign-in is the way out of that.
 *
 * ── Why this does not look at the database ──────────────────────────────────
 *
 * The first version read `auth.users.encrypted_password` and offered the page
 * when it was empty. It is never empty: Supabase gives every account it creates
 * from a magic link a long random password, so the hash is always there and
 * nobody knows the password behind it. Every real account checked on
 * 2026-10-23 had one. The page was never shown to the people it was built for.
 *
 * So the app records the fact itself: `password_set: true` in the user's
 * metadata, written by every path where a person chooses a password — sign-up,
 * this page, and a password reset. No flag means nobody here has ever been
 * asked for one, which is exactly the account that needs offering.
 */

interface WithMetadata {
  user_metadata?: Record<string, unknown> | null
}

/** The metadata key, in one place so the writers and the reader agree. */
export const PASSWORD_SET_FLAG = 'password_set'

/** True once this person has chosen a password through one of our forms. */
export function knowsPassword(user: WithMetadata | null | undefined): boolean {
  return user?.user_metadata?.[PASSWORD_SET_FLAG] === true
}

const PASSWORD_PAGES = ['/auth/set-password', '/auth/reset-password']

/**
 * Whether a link sign-in heading to `next` should stop at the password page
 * first. Not when it is already going to one: a password-reset link exists to
 * set a password, and sending it somewhere else to do the same would be a loop.
 */
export function offersPassword(next: string): boolean {
  return !PASSWORD_PAGES.some((p) => next === p || next.startsWith(`${p}?`))
}

/** The password page, remembering where the person was going. */
export function setPasswordPath(next: string): string {
  return `/auth/set-password?next=${encodeURIComponent(next)}`
}
