'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

// ── Update profile ────────────────────────────────────────────────────────────

/**
 * Update the signed-in user's own profile.
 *
 * Takes no user id: the only account anyone may edit here is their own, so it
 * comes from the session rather than the request. A server action's arguments
 * are client-supplied, and an id parameter would be one more thing to check.
 */
export async function updateProfileAction(formData: FormData) {
  const user = await requireUser()

  const fullName  = ((formData.get('fullName')  as string | null) ?? '').trim()
  const avatarUrl = ((formData.get('avatarUrl') as string | null) ?? '').trim()

  if (!fullName) {
    return redirect('/account/profile?error=' + encodeURIComponent('Your name cannot be empty.'))
  }
  if (fullName.length > 100) {
    return redirect('/account/profile?error=' + encodeURIComponent('Name must be 100 characters or fewer.'))
  }
  if (avatarUrl && !/^https:\/\/\S+$/i.test(avatarUrl)) {
    return redirect('/account/profile?error=' + encodeURIComponent('Avatar must be an https:// URL.'))
  }

  await db.profile.update({
    where: { id: user.id },
    data:  { fullName, avatarUrl: avatarUrl || null },
  })

  // Keep Supabase's copy in step. It seeds the profiles row at signup via the
  // on_auth_user_created trigger, so letting the two drift means a future
  // backfill would quietly reinstate the old name.
  const supabase = await createClient()
  await supabase.auth.updateUser({
    data: { full_name: fullName, avatar_url: avatarUrl || null },
  })

  revalidatePath('/account/profile')
  redirect('/account/profile?saved=true')
}

// ── Request a password change ─────────────────────────────────────────────────

/**
 * Send the signed-in user a password reset link.
 *
 * Deliberately not an in-page "new password" field: changing a password from an
 * already-open session lets anyone at an unlocked machine take the account over.
 * Going through the emailed link proves control of the mailbox.
 */
export async function requestPasswordChangeAction() {
  const user = await requireUser()

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
  })

  if (error) {
    return redirect('/account/profile?error=' + encodeURIComponent(error.message))
  }

  redirect('/account/profile?message=' + encodeURIComponent(
    `Password reset link sent to ${user.email}.`
  ))
}
