'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, rateLimitMessage } from '@/lib/rate-limit'
import { callerIp } from '@/lib/rate-limit/caller'
import { safeNext } from '@/lib/auth/redirect'
import { requestOrigin } from '@/lib/auth/origin'
import { scorePassword } from './signup/_components/password-strength'
import { PASSWORD_SET_FLAG } from '@/lib/auth/password'

/**
 * PRD §22.2 asks for a limit on authentication attempts.
 *
 * Keyed by IP, which is the only identifier available before anyone is signed
 * in — and the one that matters, since the attack this stops is one caller
 * trying many addresses or many passwords. The budget is shared across sign-in,
 * sign-up, magic links, password resets and verification resends on purpose:
 * they are all ways of asking the auth server to do work for an unknown caller.
 *
 * Returns an error path to redirect to, or null when the attempt may proceed.
 * Not exported — a 'use server' module may only export server actions.
 */
async function authAttemptBlocked(errorPath: string): Promise<string | null> {
  const limit = await checkRateLimit('auth_attempt', await callerIp())
  if (limit.allowed) return null
  const join = errorPath.includes('?') ? '&' : '?'
  return `${errorPath}${join}error=${encodeURIComponent(rateLimitMessage(limit))}`
}

// ── Sign Up ───────────────────────────────────────────────────────────────

export async function signUpAction(formData: FormData) {
  const blocked = await authAttemptBlocked('/auth/signup')
  if (blocked) return redirect(blocked)

  const supabase = await createClient()

  const firstName = String(formData.get('firstName') ?? '').trim()
  const lastName  = String(formData.get('lastName') ?? '').trim()
  const email     = String(formData.get('email') ?? '').trim()
  const password  = formData.get('password')   as string

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // password_set: they chose this password, so a later link sign-in
      // need not offer one — see lib/auth/password.
      data: { full_name: `${firstName} ${lastName}`.trim(), [PASSWORD_SET_FLAG]: true },
      // /api/auth/callback, not /auth/verify. /auth/verify is the "check your
      // inbox" page — it reads email/error/message off the query string and
      // never touches the `code`, so clicking the confirmation link landed
      // there, created no session, and left the person to sign in by hand.
      // Every other flow already pointed at the callback; sign-up was the
      // odd one out.
      emailRedirectTo: `${await requestOrigin()}/api/auth/callback`,
    },
  })

  if (error) {
    return redirect(`/auth/signup?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/auth/verify?email=' + encodeURIComponent(email))
}

// ── Sign In (password) ────────────────────────────────────────────────────

export async function signInAction(formData: FormData) {
  const supabase = await createClient()

  const email    = String(formData.get('email') ?? '').trim()
  const password = formData.get('password') as string

  const next = safeNext(formData.get('next') as string | null)
  const onError = safeNext(formData.get('errorPath') as string | null) ?? '/auth/login'

  const blocked = await authAttemptBlocked(onError)
  if (blocked) return redirect(blocked)

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    const join = onError.includes('?') ? '&' : '?'
    const back = next ? `&next=${encodeURIComponent(next)}` : ''
    return redirect(`${onError}${join}error=${encodeURIComponent(error.message)}${back}`)
  }

  // Straight to where they were headed — bouncing an invitation link through
  // the dashboard loses it.
  redirect(next ?? '/dashboard?message=' + encodeURIComponent('Welcome back! You are now signed in.'))
}

// ── Magic Link ────────────────────────────────────────────────────────────

export async function signInWithMagicLinkAction(formData: FormData) {
  const supabase = await createClient()

  const email = String(formData.get('email') ?? '').trim()

  const next = safeNext(formData.get('next') as string | null)

  const onError = safeNext(formData.get('errorPath') as string | null) ?? '/auth/login'

  const blocked = await authAttemptBlocked(onError)
  if (blocked) return redirect(blocked)

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${await requestOrigin()}/api/auth/callback`
        + (next ? `?next=${encodeURIComponent(next)}` : ''),
    },
  })

  if (error) {
    const join = onError.includes('?') ? '&' : '?'
    return redirect(`${onError}${join}error=${encodeURIComponent(error.message)}`)
  }

  // Participants signing in from a challenge stay on that page to read the
  // "check your inbox" message; the product login has its own verify screen.
  const sent = safeNext(formData.get('sentPath') as string | null)
  if (sent) {
    const join = sent.includes('?') ? '&' : '?'
    redirect(`${sent}${join}sent=${encodeURIComponent(email)}`)
  }

  redirect('/auth/verify?email=' + encodeURIComponent(email))
}

// ── Forgot Password ───────────────────────────────────────────────────────

export async function forgotPasswordAction(formData: FormData) {
  const blocked = await authAttemptBlocked('/auth/forgot-password')
  if (blocked) return redirect(blocked)

  const supabase = await createClient()

  const email = String(formData.get('email') ?? '').trim()

  // Through the callback, like every other emailed link. The server client
  // uses the PKCE flow, so the link arrives with a `code` that has to be
  // exchanged for a session — and /auth/reset-password never did that, so
  // "Set a new password" always failed with no session.
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await requestOrigin()}/api/auth/callback?next=${encodeURIComponent('/auth/reset-password')}`,
  })

  if (error) {
    return redirect(`/auth/forgot-password?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/auth/forgot-password?sent=true')
}

// ── Reset Password ────────────────────────────────────────────────────────

export async function resetPasswordAction(formData: FormData) {
  const supabase = await createClient()

  const password = formData.get('password') as string
  const confirm  = formData.get('confirm')  as string

  if (password !== confirm) {
    return redirect(`/auth/reset-password?error=${encodeURIComponent('Passwords do not match')}`)
  }

  const { error } = await supabase.auth.updateUser({ password, data: { [PASSWORD_SET_FLAG]: true } })

  if (error) {
    return redirect(`/auth/reset-password?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/auth/login?message=' + encodeURIComponent('Password updated successfully! Please sign in with your new password.'))
}

// ── Create a password (after an email-link sign-in) ───────────────────────

export type SetPasswordResult = { ok: true; next: string } | { ok: false; error: string }

/**
 * Give a link-only account a password.
 *
 * Reached from /auth/set-password, which the auth callback sends people to
 * after an email-link sign-in when their account has none. Returns rather
 * than redirects, so the form can say "Saved" before moving on.
 *
 * The rules are the sign-up form's, checked here as well as in the browser —
 * a form's rules are a courtesy, this is the gate. Only a signed-in person can
 * set a password, and only their own: `updateUser` acts on the session.
 */
export async function setPasswordAction(formData: FormData): Promise<SetPasswordResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Your sign-in has expired. Open a new link from your email.' }

  const password = String(formData.get('password') ?? '')
  const confirm  = String(formData.get('confirm') ?? '')
  const next     = safeNext(formData.get('next') as string | null) ?? '/dashboard'

  if (!scorePassword(password).valid) {
    return { ok: false, error: 'Use at least 8 characters, including a number.' }
  }
  if (password !== confirm) return { ok: false, error: 'The two passwords do not match.' }

  // The flag is what stops the next link sign-in offering this page again.
  const { error } = await supabase.auth.updateUser({ password, data: { [PASSWORD_SET_FLAG]: true } })
  if (error) return { ok: false, error: error.message }

  return { ok: true, next }
}

// ── Sign Out ──────────────────────────────────────────────────────────────

/**
 * Sign out, then land on the login page.
 *
 * `next` is where to go after signing back in — used by the invitation page,
 * where the token belongs to a different address than the current session.
 * Only same-site paths are honoured: the value reaches this from a link, and
 * an absolute URL here would be an open redirect.
 */
export async function signOutAction(next?: string) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect(safeNext(next) ? `/auth/login?next=${encodeURIComponent(next!)}` : '/auth/login')
}


// ── Resend Verification Email ─────────────────────────────────────────────

export async function resendVerificationAction(formData: FormData) {
  const supabase = await createClient()

  const email = String(formData.get('email') ?? '').trim()

  const blocked = await authAttemptBlocked(`/auth/verify?email=${encodeURIComponent(email)}`)
  if (blocked) return redirect(blocked)

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: `${await requestOrigin()}/api/auth/callback`,
    },
  })

  if (error) {
    return redirect(
      `/auth/verify?email=${encodeURIComponent(email)}&error=${encodeURIComponent(error.message)}`
    )
  }

  redirect(
    `/auth/verify?email=${encodeURIComponent(email)}&message=${encodeURIComponent('Verification email resent — check your inbox.')}`
  )
}
