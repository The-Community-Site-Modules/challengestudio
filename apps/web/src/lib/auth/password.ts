/**
 * Whether someone who signed in by email link has a password yet.
 *
 * Everyone who registers for a challenge arrives by magic link and never sets
 * a password. That works until the day they open the link on a different
 * device — the link only completes in the browser that asked for it — and land
 * on a sign-in page asking for a password they never had. Offering to create
 * one straight after a link sign-in is the way out of that.
 *
 * Supabase's client API does not say whether a user has a password, so this
 * asks the auth schema directly. The app connects as the database owner, which
 * can read it; nothing here is exposed to a browser.
 */

import { db } from '@/lib/db'

/**
 * True when the account has a password. Unknown users answer true — the
 * point is to offer, not to nag, and a lookup that finds nothing is no reason
 * to send someone to a form.
 */
export async function hasPassword(userId: string): Promise<boolean> {
  const rows = await db.$queryRaw<{ has: boolean }[]>`
    select (encrypted_password is not null and encrypted_password <> '') as has
      from auth.users
     where id = ${userId}::uuid
  `
  return rows[0]?.has ?? true
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
