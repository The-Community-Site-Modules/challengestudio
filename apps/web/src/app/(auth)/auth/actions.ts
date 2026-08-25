'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// ── Sign Up ───────────────────────────────────────────────────────────────

export async function signUpAction(formData: FormData) {
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

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return redirect(`/auth/login?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/dashboard?message=' + encodeURIComponent('Welcome back! You are now signed in.'))
}

// ── Magic Link ────────────────────────────────────────────────────────────

export async function signInWithMagicLinkAction(formData: FormData) {
  const supabase = await createClient()

  const email = (formData.get('email') as string).trim()

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify`,
    },
  })

  if (error) {
    return redirect(`/auth/login?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/auth/verify?email=' + encodeURIComponent(email))
}

// ── Forgot Password ───────────────────────────────────────────────────────

export async function forgotPasswordAction(formData: FormData) {
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

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}

// ── Resend Verification Email ─────────────────────────────────────────────

export async function resendVerificationAction(formData: FormData) {
  const supabase = await createClient()

  const email = (formData.get('email') as string).trim()

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
