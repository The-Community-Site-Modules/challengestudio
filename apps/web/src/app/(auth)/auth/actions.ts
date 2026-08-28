'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, rateLimitMessage } from '@/lib/rate-limit'
import { callerIp } from '@/lib/rate-limit/caller'

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

  const firstName = (formData.get('firstName') as string).trim()
  const lastName  = (formData.get('lastName')  as string).trim()
  const email     = (formData.get('email')     as string).trim()
  const password  = formData.get('password')   as string

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: `${firstName} ${lastName}`.trim() },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify`,
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

  const email    = (formData.get('email')    as string).trim()
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

  const email = (formData.get('email') as string).trim()

  const next = safeNext(formData.get('next') as string | null)

  const onError = safeNext(formData.get('errorPath') as string | null) ?? '/auth/login'

  const blocked = await authAttemptBlocked(onError)
  if (blocked) return redirect(blocked)

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`
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

  const email = (formData.get('email') as string).trim()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
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

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return redirect(`/auth/reset-password?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/auth/login?message=' + encodeURIComponent('Password updated successfully! Please sign in with your new password.'))
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

/**
 * A path on this site: starts with a single slash, never `//` or a scheme.
 *
 * Not exported — every export from a 'use server' module has to be an async
 * server action, and this is a plain helper.
 */
function safeNext(value: string | null | undefined): string | null {
  if (!value) return null
  if (!value.startsWith('/')) return null
  if (value.startsWith('//')) return null
  return value
}

// ── Resend Verification Email ─────────────────────────────────────────────

export async function resendVerificationAction(formData: FormData) {
  const supabase = await createClient()

  const email = (formData.get('email') as string).trim()

  const blocked = await authAttemptBlocked(`/auth/verify?email=${encodeURIComponent(email)}`)
  if (blocked) return redirect(blocked)

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
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
